using Expenn.Api.Application.Common;
using Expenn.Api.Data;
using Expenn.Api.Data.Entities;
using Expenn.Api.Domain.Events;
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
    [HttpGet]
    public async Task<ActionResult<List<ExpenseDto>>> List(
        [FromQuery] string? status, [FromQuery] string? tripId, [FromQuery] bool mine = false, CancellationToken ct = default)
    {
        var query = db.Expenses.Where(e => e.OrganizationId == currentUser.OrgId && e.DeletedAt == null);

        if (!string.IsNullOrEmpty(status)) query = query.Where(e => e.Status == status);
        if (!string.IsNullOrEmpty(tripId)) query = query.Where(e => e.TripId == tripId);

        if (!currentUser.IsManager || mine)
            query = query.Where(e => e.UserId == currentUser.UserId);

        return Ok(await query
            .OrderByDescending(e => e.ExpenseDate)
            .Select(e => ToDto(e, e.Trip != null ? e.Trip.Name : null))
            .ToListAsync(ct));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ExpenseDto>> GetById(string id, CancellationToken ct)
    {
        var expense = await db.Expenses
            .Include(e => e.Trip)
            .FirstOrDefaultAsync(e => e.Id == id && e.OrganizationId == currentUser.OrgId && e.DeletedAt == null, ct);
        if (expense is null) return NotFound();
        if (!currentUser.IsManager && expense.UserId != currentUser.UserId) return Forbid();
        return Ok(ToDto(expense, expense.Trip?.Name));
    }

    [HttpPost]
    public async Task<ActionResult<ExpenseDto>> Create([FromBody] CreateExpenseRequest req, CancellationToken ct)
    {
        var expense = new Expense
        {
            OrganizationId = currentUser.OrgId,
            UserId = currentUser.UserId,
            TripId = req.TripId,
            Merchant = req.Merchant,
            Amount = req.Amount,
            Currency = req.Currency.ToUpperInvariant(),
            Category = req.Category,
            ExpenseDate = req.ExpenseDate,
            Notes = req.Notes,
            PaymentMethod = req.PaymentMethod,
            Reimbursable = req.Reimbursable,
            ReceiptFileUrl = req.ReceiptFileUrl,
            Status = "draft",
        };
        db.Expenses.Add(expense);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetById), new { id = expense.Id }, ToDto(expense));
    }

    [HttpPost("{id}/submit")]
    public async Task<ActionResult<ExpenseDto>> Submit(string id, CancellationToken ct)
    {
        var expense = await db.Expenses.FirstOrDefaultAsync(
            e => e.Id == id && e.OrganizationId == currentUser.OrgId && e.UserId == currentUser.UserId, ct);
        if (expense is null) return NotFound();
        if (expense.Status != "draft") return BadRequest(new { error = "Only draft expenses can be submitted" });

        expense.Status = "submitted";
        expense.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        await bus.Publish(new ExpenseSubmittedEvent(
            expense.Id, expense.UserId, expense.OrganizationId,
            expense.Amount, expense.Currency, expense.TripId,
            DateTimeOffset.UtcNow), ct);

        return Ok(ToDto(expense));
    }

    [HttpPatch("{id}/review")]
    public async Task<ActionResult<ExpenseDto>> Review(string id, [FromBody] ReviewExpenseRequest req, CancellationToken ct)
    {
        if (!currentUser.IsManager) return Forbid();

        var expense = await db.Expenses.FirstOrDefaultAsync(
            e => e.Id == id && e.OrganizationId == currentUser.OrgId && e.DeletedAt == null, ct);
        if (expense is null) return NotFound();

        var validStatuses = new[] { "approved", "rejected", "reimbursed" };
        if (!validStatuses.Contains(req.Status)) return BadRequest(new { error = "Invalid status" });

        expense.Status = req.Status;
        expense.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        await bus.Publish(new ExpenseReviewedEvent(
            expense.Id, currentUser.UserId, expense.OrganizationId,
            req.Status, DateTimeOffset.UtcNow), ct);

        return Ok(ToDto(expense));
    }

    [HttpGet("summary")]
    public async Task<ActionResult<ExpenseSummaryDto>> Summary(CancellationToken ct)
    {
        var query = db.Expenses.Where(e => e.OrganizationId == currentUser.OrgId && e.DeletedAt == null);
        if (!currentUser.IsManager) query = query.Where(e => e.UserId == currentUser.UserId);

        var all = await query.Select(e => new { e.Status, e.Amount }).ToListAsync(ct);

        return Ok(new ExpenseSummaryDto(
            all.Count,
            all.Count(e => e.Status == "draft"),
            all.Count(e => e.Status == "submitted"),
            all.Count(e => e.Status == "approved"),
            all.Count(e => e.Status == "rejected"),
            all.Count(e => e.Status == "reimbursed"),
            all.Sum(e => e.Amount)
        ));
    }

    private static ExpenseDto ToDto(Expense e, string? tripName = null) => new(
        e.Id, e.OrganizationId, e.UserId, e.TripId, e.Merchant, e.Amount,
        e.Currency, e.Category, e.ExpenseDate, e.ReceiptFileUrl,
        e.Status, e.Notes, e.PaymentMethod, e.Reimbursable, e.CreatedAt, e.UpdatedAt, tripName);
}
