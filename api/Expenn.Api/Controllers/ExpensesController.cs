using System.Globalization;
using System.Text;
using Expenn.Api.Application.Common;
using Expenn.Api.Data;
using Expenn.Api.Data.Entities;
using Expenn.Api.Domain.Events;
using Expenn.Api.Domain.Expenses;
using Expenn.Api.DTOs.Expenses;
using MassTransit;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Expenn.Api.Controllers;

[ApiController]
[Route("api/expenses")]
[Authorize]
public class ExpensesController(
    AppDbContext db,
    ICurrentUserContext currentUser,
    IPublishEndpoint bus) : ControllerBase
{
    private const int MaxBulkReview = 200;

    [HttpGet]
    public async Task<ActionResult<List<ExpenseDto>>> List(
        [FromQuery] string? status, [FromQuery] string? tripId, [FromQuery] bool mine = false,
        [FromQuery] DateTimeOffset? from = null, [FromQuery] DateTimeOffset? to = null, CancellationToken ct = default)
    {
        return Ok(await ToDtosAsync(Filter(status, tripId, mine, from, to), ct));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ExpenseDto>> GetById(string id, CancellationToken ct)
    {
        var expense = await db.Expenses
            .FirstOrDefaultAsync(e => e.Id == id && e.OrganizationId == currentUser.OrgId && e.DeletedAt == null, ct);
        if (expense is null) return NotFound();
        if (!currentUser.IsManager && expense.UserId != currentUser.UserId) return Forbid();
        return Ok((await ToDtosAsync(db.Expenses.Where(e => e.Id == id), ct))[0]);
    }

    [HttpPost]
    public async Task<ActionResult<ExpenseDto>> Create([FromBody] CreateExpenseRequest req, CancellationToken ct)
    {
        var invalid = await ValidateAsync(req.Merchant, req.Amount, req.Currency, req.TripId, ct);
        if (invalid is not null) return BadRequest(new { error = invalid });

        var expense = new Expense
        {
            OrganizationId = currentUser.OrgId,
            UserId = currentUser.UserId,
            Status = ExpenseStatus.Draft,
        };
        Apply(expense, req.TripId, req.Merchant, req.Amount, req.Currency, req.Category, req.ExpenseDate,
            req.Notes, req.PaymentMethod, req.Reimbursable, req.ReceiptFileUrl);
        db.Expenses.Add(expense);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetById), new { id = expense.Id }, ToDto(expense));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ExpenseDto>> Update(string id, [FromBody] UpdateExpenseRequest req, CancellationToken ct)
    {
        var expense = await FindOwnedAsync(id, ct);
        if (expense is null) return NotFound();
        if (!ExpenseWorkflow.IsEditable(expense.Status))
            return BadRequest(new { error = "Submitted expenses can't be edited until a reviewer sends them back" });

        var invalid = await ValidateAsync(req.Merchant, req.Amount, req.Currency, req.TripId, ct);
        if (invalid is not null) return BadRequest(new { error = invalid });

        Apply(expense, req.TripId, req.Merchant, req.Amount, req.Currency, req.Category, req.ExpenseDate,
            req.Notes, req.PaymentMethod, req.Reimbursable, req.ReceiptFileUrl);
        // A rejected expense goes back to draft; the review note stays visible until it is resubmitted.
        expense.Status = ExpenseStatus.Draft;
        expense.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok((await ToDtosAsync(db.Expenses.Where(e => e.Id == id), ct))[0]);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        var expense = await FindOwnedAsync(id, ct);
        if (expense is null) return NotFound();
        if (!ExpenseWorkflow.IsEditable(expense.Status))
            return BadRequest(new { error = "Only draft or rejected expenses can be deleted" });

        expense.DeletedAt = DateTimeOffset.UtcNow;
        expense.UpdatedAt = expense.DeletedAt.Value;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{id}/submit")]
    public async Task<ActionResult<ExpenseDto>> Submit(string id, CancellationToken ct)
    {
        var expense = await FindOwnedAsync(id, ct);
        if (expense is null) return NotFound();

        var check = ExpenseWorkflow.CanSubmit(expense.Status);
        if (check.IsFailure) return BadRequest(new { error = check.Error });

        var now = DateTimeOffset.UtcNow;
        expense.Status = ExpenseStatus.Submitted;
        expense.SubmittedAt = now;
        expense.ReviewedAt = null;
        expense.ReviewedById = null;
        expense.ReviewNote = null;
        expense.UpdatedAt = now;
        await db.SaveChangesAsync(ct);

        await bus.Publish(new ExpenseSubmittedEvent(
            expense.Id, expense.UserId, expense.OrganizationId,
            expense.Amount, expense.Currency, expense.TripId, now), ct);

        return Ok(ToDto(expense));
    }

    [HttpPatch("{id}/review")]
    public async Task<ActionResult<ExpenseDto>> Review(string id, [FromBody] ReviewExpenseRequest req, CancellationToken ct)
    {
        if (!currentUser.IsManager) return Forbid();

        var expense = await db.Expenses.FirstOrDefaultAsync(
            e => e.Id == id && e.OrganizationId == currentUser.OrgId && e.DeletedAt == null, ct);
        if (expense is null) return NotFound();

        var result = ApplyReview(expense, req.Status, req.Notes);
        if (result.IsFailure) return BadRequest(new { error = result.Error });

        await db.SaveChangesAsync(ct);
        await PublishReviewedAsync(expense, ct);

        return Ok((await ToDtosAsync(db.Expenses.Where(e => e.Id == id), ct))[0]);
    }

    /// <summary>Approve, reject, or pay out many expenses at once. Invalid items are skipped and reported.</summary>
    [HttpPost("review")]
    public async Task<ActionResult<BulkReviewResultDto>> BulkReview([FromBody] BulkReviewExpensesRequest req, CancellationToken ct)
    {
        if (!currentUser.IsManager) return Forbid();

        var ids = req.Ids.Where(x => !string.IsNullOrWhiteSpace(x)).Distinct().ToList();
        if (ids.Count == 0) return BadRequest(new { error = "Select at least one expense" });
        if (ids.Count > MaxBulkReview) return BadRequest(new { error = $"Review at most {MaxBulkReview} expenses at a time" });

        var expenses = await db.Expenses
            .Where(e => ids.Contains(e.Id) && e.OrganizationId == currentUser.OrgId && e.DeletedAt == null)
            .ToListAsync(ct);

        var failed = ids.Except(expenses.Select(e => e.Id)).Select(id => new BulkReviewFailure(id, "Not found")).ToList();
        var updated = new List<Expense>();
        foreach (var expense in expenses)
        {
            var result = ApplyReview(expense, req.Status, req.Notes);
            if (result.IsSuccess) updated.Add(expense);
            else failed.Add(new BulkReviewFailure(expense.Id, result.Error));
        }

        await db.SaveChangesAsync(ct);
        foreach (var expense in updated) await PublishReviewedAsync(expense, ct);

        return Ok(new BulkReviewResultDto(updated.Count, failed));
    }

    [HttpGet("summary")]
    public async Task<ActionResult<ExpenseSummaryDto>> Summary(CancellationToken ct)
    {
        var query = db.Expenses.Where(e => e.OrganizationId == currentUser.OrgId && e.DeletedAt == null);
        if (!currentUser.IsManager) query = query.Where(e => e.UserId == currentUser.UserId);

        var all = await query.Select(e => new { e.Status, e.Amount, e.Currency, e.Reimbursable }).ToListAsync(ct);

        var byCurrency = all
            .Where(e => e.Status != ExpenseStatus.Draft)
            .GroupBy(e => e.Currency)
            .Select(g => new CurrencyTotalDto(
                g.Key,
                g.Where(e => e.Status != ExpenseStatus.Rejected).Sum(e => e.Amount),
                g.Where(e => e.Status == ExpenseStatus.Submitted).Sum(e => e.Amount),
                g.Where(e => e.Status == ExpenseStatus.Approved && e.Reimbursable).Sum(e => e.Amount),
                g.Where(e => e.Status == ExpenseStatus.Reimbursed).Sum(e => e.Amount)))
            .OrderByDescending(c => c.Total)
            .ToList();

        return Ok(new ExpenseSummaryDto(
            all.Count,
            all.Count(e => e.Status == ExpenseStatus.Draft),
            all.Count(e => e.Status == ExpenseStatus.Submitted),
            all.Count(e => e.Status == ExpenseStatus.Approved),
            all.Count(e => e.Status == ExpenseStatus.Rejected),
            all.Count(e => e.Status == ExpenseStatus.Reimbursed),
            all.Sum(e => e.Amount),
            byCurrency
        ));
    }

    /// <summary>
    /// CSV export for payroll and accounting imports (QuickBooks, Xero, spreadsheets).
    /// Uses the same filters and visibility rules as the list endpoint.
    /// </summary>
    [HttpGet("export")]
    public async Task<IActionResult> Export(
        [FromQuery] string? status, [FromQuery] string? tripId, [FromQuery] bool mine = false,
        [FromQuery] DateTimeOffset? from = null, [FromQuery] DateTimeOffset? to = null, CancellationToken ct = default)
    {
        var rows = await ToDtosAsync(Filter(status, tripId, mine, from, to), ct);
        var emails = await db.Users
            .Where(u => rows.Select(r => r.UserId).Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.Email, ct);

        var csv = new StringBuilder();
        csv.AppendLine("Expense date,Traveler,Email,Merchant,Category,Amount,Currency,Status,Trip,Payment method,Reimbursable,Receipt,Notes,Submitted at,Reviewed at,Reviewed by,Review note,Reimbursed at,Flags,Expense ID");
        foreach (var e in rows.OrderBy(r => r.ExpenseDate))
        {
            csv.AppendJoin(',', new[]
            {
                e.ExpenseDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                Csv(e.TravelerName), Csv(emails.GetValueOrDefault(e.UserId)), Csv(e.Merchant), Csv(e.Category),
                e.Amount.ToString("0.00", CultureInfo.InvariantCulture), e.Currency, e.Status,
                Csv(e.TripName), Csv(e.PaymentMethod), e.Reimbursable ? "yes" : "no",
                Csv(e.ReceiptFileUrl), Csv(e.Notes),
                Timestamp(e.SubmittedAt), Timestamp(e.ReviewedAt), Csv(e.ReviewedByName), Csv(e.ReviewNote),
                Timestamp(e.ReimbursedAt), Csv(string.Join(' ', e.Flags ?? [])), e.Id,
            });
            csv.AppendLine();
        }

        var fileName = $"expenn-expenses-{DateTimeOffset.UtcNow:yyyy-MM-dd}.csv";
        return File(Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(csv.ToString())).ToArray(), "text/csv", fileName);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private IQueryable<Expense> Filter(string? status, string? tripId, bool mine, DateTimeOffset? from, DateTimeOffset? to)
    {
        var query = db.Expenses.Where(e => e.OrganizationId == currentUser.OrgId && e.DeletedAt == null);

        if (!string.IsNullOrEmpty(status)) query = query.Where(e => e.Status == status);
        if (!string.IsNullOrEmpty(tripId)) query = query.Where(e => e.TripId == tripId);
        if (from is not null) query = query.Where(e => e.ExpenseDate >= from);
        if (to is not null) query = query.Where(e => e.ExpenseDate < to);

        if (!currentUser.IsManager || mine)
            query = query.Where(e => e.UserId == currentUser.UserId);

        return query;
    }

    private Task<Expense?> FindOwnedAsync(string id, CancellationToken ct) =>
        db.Expenses.FirstOrDefaultAsync(
            e => e.Id == id && e.OrganizationId == currentUser.OrgId && e.UserId == currentUser.UserId && e.DeletedAt == null, ct);

    private async Task<string?> ValidateAsync(string merchant, decimal amount, string currency, string? tripId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(merchant)) return "Merchant is required";
        if (amount <= 0) return "Amount must be greater than zero";
        if (string.IsNullOrWhiteSpace(currency) || currency.Trim().Length is < 3 or > 5) return "Use a 3-letter currency code, e.g. USD";
        if (!string.IsNullOrEmpty(tripId)
            && !await db.Trips.AnyAsync(t => t.Id == tripId && t.OrganizationId == currentUser.OrgId && t.DeletedAt == null, ct))
            return "Select a valid trip";
        return null;
    }

    private static void Apply(
        Expense expense, string? tripId, string merchant, decimal amount, string currency, string category,
        DateTimeOffset expenseDate, string? notes, string? paymentMethod, bool reimbursable, string? receiptFileUrl)
    {
        expense.TripId = string.IsNullOrEmpty(tripId) ? null : tripId;
        expense.Merchant = merchant.Trim();
        expense.Amount = amount;
        expense.Currency = currency.Trim().ToUpperInvariant();
        expense.Category = category.Trim();
        expense.ExpenseDate = expenseDate;
        expense.Notes = notes;
        expense.PaymentMethod = paymentMethod;
        expense.Reimbursable = reimbursable;
        expense.ReceiptFileUrl = receiptFileUrl ?? expense.ReceiptFileUrl;
    }

    private Result ApplyReview(Expense expense, string status, string? notes)
    {
        var check = ExpenseWorkflow.CanReview(expense.Status, status, notes);
        if (check.IsFailure) return check;

        var now = DateTimeOffset.UtcNow;
        if (status == ExpenseStatus.Reimbursed)
        {
            expense.ReimbursedAt = now;
        }
        else
        {
            expense.ReviewedAt = now;
            expense.ReviewedById = currentUser.UserId;
            expense.ReviewNote = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
        }
        expense.Status = status;
        expense.UpdatedAt = now;
        return Result.Ok();
    }

    private Task PublishReviewedAsync(Expense expense, CancellationToken ct) =>
        bus.Publish(new ExpenseReviewedEvent(
            expense.Id, currentUser.UserId, expense.OrganizationId,
            expense.Status, DateTimeOffset.UtcNow), ct);

    private async Task<List<ExpenseDto>> ToDtosAsync(IQueryable<Expense> query, CancellationToken ct)
    {
        var rows = await query
            .OrderByDescending(e => e.ExpenseDate)
            .Select(e => new
            {
                Expense = e,
                TripName = e.Trip != null ? e.Trip.Name : null,
                TravelerName = e.User.Name,
                ReviewerName = e.ReviewedBy != null ? e.ReviewedBy.Name : null,
            })
            .ToListAsync(ct);
        if (rows.Count == 0) return [];

        // Duplicate detection looks beyond the filtered page: same traveler, amount, and day.
        var userIds = rows.Select(r => r.Expense.UserId).Distinct().ToList();
        var minDate = rows.Min(r => r.Expense.ExpenseDate).AddDays(-1);
        var maxDate = rows.Max(r => r.Expense.ExpenseDate).AddDays(1);
        var pool = await db.Expenses
            .Where(e => e.OrganizationId == currentUser.OrgId && e.DeletedAt == null
                     && userIds.Contains(e.UserId) && e.ExpenseDate >= minDate && e.ExpenseDate <= maxDate)
            .Select(e => new { e.Id, e.UserId, e.Amount, e.Currency, e.ExpenseDate, e.ReceiptFileUrl })
            .ToListAsync(ct);

        var flags = ExpenseFlags.Compute(
            rows.Select(r => ToCandidate(r.Expense.Id, r.Expense.UserId, r.Expense.Amount, r.Expense.Currency, r.Expense.ExpenseDate, r.Expense.ReceiptFileUrl)).ToList(),
            pool.Select(p => ToCandidate(p.Id, p.UserId, p.Amount, p.Currency, p.ExpenseDate, p.ReceiptFileUrl)));

        return rows
            .Select(r => ToDto(r.Expense, r.TripName, r.TravelerName, flags[r.Expense.Id], r.ReviewerName))
            .ToList();
    }

    private static ExpenseFlags.Candidate ToCandidate(
        string id, string userId, decimal amount, string currency, DateTimeOffset date, string? receipt) =>
        new(id, userId, amount, currency, date, receipt);

    private static ExpenseDto ToDto(
        Expense e, string? tripName = null, string? travelerName = null, string[]? flags = null, string? reviewerName = null) => new(
        e.Id, e.OrganizationId, e.UserId, e.TripId, e.Merchant, e.Amount,
        e.Currency, e.Category, e.ExpenseDate, e.ReceiptFileUrl,
        e.Status, e.Notes, e.PaymentMethod, e.Reimbursable, e.CreatedAt, e.UpdatedAt,
        tripName, travelerName, flags ?? [], e.SubmittedAt, e.ReviewedAt, reviewerName, e.ReviewNote, e.ReimbursedAt);

    private static string Timestamp(DateTimeOffset? value) =>
        value?.UtcDateTime.ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture) ?? string.Empty;

    /// <summary>Quotes a CSV cell and neutralises spreadsheet formulas (CSV injection).</summary>
    private static string Csv(string? value)
    {
        if (string.IsNullOrEmpty(value)) return string.Empty;
        if (value[0] is '=' or '+' or '-' or '@' or '\t' or '\r') value = "'" + value;
        return $"\"{value.Replace("\"", "\"\"")}\"";
    }
}
