using Expenn.Api.Data;
using Expenn.Api.Domain.Expenses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Expenn.Api.Controllers;

[ApiController]
[Route("api/analytics")]
[Authorize]
public class AnalyticsController(AppDbContext db) : ControllerBase
{
    private string OrgId => User.FindFirst("org_id")?.Value ?? string.Empty;
    private string Role => User.FindFirst("role")?.Value ?? "traveler";
    private bool IsManager => Role is "owner" or "admin" or "manager";

    private static readonly string[] Committed = [ExpenseStatus.Submitted, ExpenseStatus.Approved, ExpenseStatus.Reimbursed];
    private static readonly string[] Approved = [ExpenseStatus.Approved, ExpenseStatus.Reimbursed];

    /// <summary>
    /// Spend overview for a calendar year (or one month of it). Amounts are never summed
    /// across currencies: every money figure is reported per currency, largest first.
    /// </summary>
    [HttpGet("overview")]
    public async Task<IActionResult> Overview(
        [FromQuery] int year = 0, [FromQuery] int month = 0, CancellationToken ct = default)
    {
        if (!IsManager) return Forbid();

        var now = DateTimeOffset.UtcNow;
        var targetYear = year > 0 ? year : now.Year;
        var fromDate = month is >= 1 and <= 12
            ? new DateTimeOffset(targetYear, month, 1, 0, 0, 0, TimeSpan.Zero)
            : new DateTimeOffset(targetYear, 1, 1, 0, 0, 0, TimeSpan.Zero);
        var toDate = month is >= 1 and <= 12 ? fromDate.AddMonths(1) : fromDate.AddYears(1);

        var expenses = await db.Expenses
            .Where(e => e.OrganizationId == OrgId
                     && e.DeletedAt == null
                     && e.ExpenseDate >= fromDate
                     && e.ExpenseDate < toDate)
            .Select(e => new
            {
                e.Amount, e.Currency, e.Category, e.Status, e.ExpenseDate, e.TripId, e.UserId,
                TravelerName = e.User.Name, e.ReceiptFileUrl, e.SubmittedAt, e.ReviewedAt, e.ReimbursedAt,
            })
            .ToListAsync(ct);

        var trips = await db.Trips
            .Where(t => t.OrganizationId == OrgId && t.DeletedAt == null && t.StartDate < toDate && t.EndDate >= fromDate)
            .Select(t => new { t.Id, t.Name, t.Destination, t.Status, t.StartDate, t.EndDate, t.Budget, t.Currency })
            .ToListAsync(ct);

        var memberCount = await db.Members.CountAsync(m => m.OrganizationId == OrgId, ct);

        var committed = expenses.Where(e => Committed.Contains(e.Status)).ToList();

        var byCurrency = committed
            .GroupBy(e => e.Currency)
            .Select(g => new
            {
                Currency = g.Key,
                Total = g.Sum(e => e.Amount),
                Approved = g.Where(e => Approved.Contains(e.Status)).Sum(e => e.Amount),
                Pending = g.Where(e => e.Status == ExpenseStatus.Submitted).Sum(e => e.Amount),
                Reimbursed = g.Where(e => e.Status == ExpenseStatus.Reimbursed).Sum(e => e.Amount),
                Budget = trips.Where(t => t.Currency == g.Key).Sum(t => t.Budget),
            })
            .OrderByDescending(x => x.Total)
            .ToList();
        // Currencies that only appear as trip budgets still deserve a row.
        byCurrency.AddRange(trips
            .Where(t => byCurrency.All(c => c.Currency != t.Currency))
            .GroupBy(t => t.Currency)
            .Select(g => new { Currency = g.Key, Total = 0m, Approved = 0m, Pending = 0m, Reimbursed = 0m, Budget = g.Sum(t => t.Budget) }));

        var byStatus = expenses
            .GroupBy(e => e.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() });

        var byCategory = committed
            .GroupBy(e => new { e.Category, e.Currency })
            .Select(g => new { g.Key.Category, g.Key.Currency, Count = g.Count(), Amount = g.Sum(e => e.Amount) })
            .OrderByDescending(x => x.Amount);

        var byMonth = committed
            .GroupBy(e => new { e.ExpenseDate.Year, e.ExpenseDate.Month, e.Currency })
            .Select(g => new { g.Key.Year, g.Key.Month, g.Key.Currency, Amount = g.Sum(e => e.Amount) })
            .OrderBy(x => x.Year).ThenBy(x => x.Month);

        var topSpenders = committed
            .GroupBy(e => new { e.UserId, e.TravelerName, e.Currency })
            .Select(g => new { g.Key.UserId, Name = g.Key.TravelerName, g.Key.Currency, Count = g.Count(), Amount = g.Sum(e => e.Amount) })
            .OrderByDescending(x => x.Amount)
            .Take(5);

        var tripSpend = trips
            .Select(t =>
            {
                var tripExpenses = committed.Where(e => e.TripId == t.Id && e.Currency == t.Currency).ToList();
                return new
                {
                    TripId = t.Id, t.Name, t.Destination, t.Status, t.StartDate, t.EndDate, t.Budget, t.Currency,
                    Approved = tripExpenses.Where(e => Approved.Contains(e.Status)).Sum(e => e.Amount),
                    Pending = tripExpenses.Where(e => e.Status == ExpenseStatus.Submitted).Sum(e => e.Amount),
                };
            })
            .OrderByDescending(t => t.StartDate)
            .ToList();

        // Cycle times: how long travelers wait for a decision and for their money.
        var reviewHours = expenses
            .Where(e => e.SubmittedAt != null && e.ReviewedAt != null && e.ReviewedAt >= e.SubmittedAt)
            .Select(e => (e.ReviewedAt!.Value - e.SubmittedAt!.Value).TotalHours)
            .ToList();
        var reimburseDays = expenses
            .Where(e => e.SubmittedAt != null && e.ReimbursedAt != null && e.ReimbursedAt >= e.SubmittedAt)
            .Select(e => (e.ReimbursedAt!.Value - e.SubmittedAt!.Value).TotalDays)
            .ToList();

        return Ok(new
        {
            Period = new { From = fromDate, To = toDate },
            ExpenseCount = expenses.Count,
            TripCount = trips.Count,
            MemberCount = memberCount,
            MissingReceipts = committed.Count(e => string.IsNullOrEmpty(e.ReceiptFileUrl)),
            AvgHoursToReview = reviewHours.Count > 0 ? Math.Round(reviewHours.Average(), 1) : (double?)null,
            AvgDaysToReimburse = reimburseDays.Count > 0 ? Math.Round(reimburseDays.Average(), 1) : (double?)null,
            ByCurrency = byCurrency,
            ByStatus = byStatus,
            ByCategory = byCategory,
            ByMonth = byMonth,
            TopSpenders = topSpenders,
            Trips = tripSpend,
        });
    }

    [HttpGet("spend-by-group")]
    public async Task<IActionResult> SpendByGroup(
        [FromQuery] int year = 0, CancellationToken ct = default)
    {
        if (!IsManager) return Forbid();

        var targetYear = year > 0 ? year : DateTimeOffset.UtcNow.Year;
        var fromDate = new DateTimeOffset(targetYear, 1, 1, 0, 0, 0, TimeSpan.Zero);
        var toDate = fromDate.AddYears(1);

        // Spend aggregated by team via trip → team join
        var teamSpend = await db.Expenses
            .Where(e => e.OrganizationId == OrgId
                     && e.DeletedAt == null
                     && e.ExpenseDate >= fromDate
                     && e.ExpenseDate < toDate
                     && e.TripId != null
                     && Committed.Contains(e.Status))
            .Join(db.Trips, e => e.TripId, t => t.Id, (e, t) => new { e.Amount, e.Currency, t.TeamId })
            .Join(db.Teams, x => x.TeamId, tm => tm.Id, (x, tm) => new { x.Amount, x.Currency, TeamName = tm.Name })
            .GroupBy(x => new { x.TeamName, x.Currency })
            .Select(g => new { Team = g.Key.TeamName, g.Key.Currency, Amount = g.Sum(x => x.Amount), Count = g.Count() })
            .OrderByDescending(x => x.Amount)
            .ToListAsync(ct);

        return Ok(new { Year = targetYear, Teams = teamSpend });
    }
}
