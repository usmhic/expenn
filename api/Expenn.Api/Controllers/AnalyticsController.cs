using Expenn.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Expenn.Api.Controllers;

[ApiController]
[Route("api/analytics")]
[Authorize]
public class AnalyticsController(AppDbContext db) : ControllerBase
{
    private string UserId => User.FindFirst("sub")?.Value ?? string.Empty;
    private string OrgId => User.FindFirst("org_id")?.Value ?? string.Empty;
    private string Role => User.FindFirst("role")?.Value ?? "traveler";
    private bool IsManager => Role is "owner" or "admin" or "manager";

    [HttpGet("overview")]
    public async Task<IActionResult> Overview(
        [FromQuery] int year = 0, [FromQuery] int month = 0, CancellationToken ct = default)
    {
        if (!IsManager) return Forbid();

        var now = DateTimeOffset.UtcNow;
        var fromDate = month > 0
            ? new DateTimeOffset(year > 0 ? year : now.Year, month, 1, 0, 0, 0, TimeSpan.Zero)
            : new DateTimeOffset(now.Year, 1, 1, 0, 0, 0, TimeSpan.Zero);
        var toDate = month > 0 ? fromDate.AddMonths(1) : fromDate.AddYears(1);

        var expenses = await db.Expenses
            .Where(e => e.OrganizationId == OrgId
                     && e.DeletedAt == null
                     && e.ExpenseDate >= fromDate
                     && e.ExpenseDate < toDate)
            .Select(e => new { e.Amount, e.Currency, e.Category, e.Status, e.ExpenseDate })
            .ToListAsync(ct);

        var totalAmount = expenses.Sum(e => e.Amount);
        var byStatus = expenses
            .GroupBy(e => e.Status)
            .Select(g => new { Status = g.Key, Count = g.Count(), Amount = g.Sum(e => e.Amount) });

        var byCategory = expenses
            .GroupBy(e => e.Category)
            .Select(g => new { Category = g.Key, Count = g.Count(), Amount = g.Sum(e => e.Amount) })
            .OrderByDescending(x => x.Amount);

        var byMonth = expenses
            .GroupBy(e => new { e.ExpenseDate.Year, e.ExpenseDate.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Amount = g.Sum(e => e.Amount) })
            .OrderBy(x => x.Year).ThenBy(x => x.Month);

        var tripCount = await db.Trips
            .Where(t => t.OrganizationId == OrgId && t.DeletedAt == null && t.StartDate >= fromDate && t.StartDate < toDate)
            .CountAsync(ct);

        return Ok(new
        {
            Period = new { From = fromDate, To = toDate },
            TotalAmount = totalAmount,
            ExpenseCount = expenses.Count,
            TripCount = tripCount,
            ByStatus = byStatus,
            ByCategory = byCategory,
            ByMonth = byMonth,
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
                     && e.TripId != null)
            .Join(db.Trips, e => e.TripId, t => t.Id, (e, t) => new { e.Amount, t.TeamId })
            .Join(db.Teams, x => x.TeamId, tm => tm.Id, (x, tm) => new { x.Amount, TeamName = tm.Name })
            .GroupBy(x => x.TeamName)
            .Select(g => new { Team = g.Key, Amount = g.Sum(x => x.Amount), Count = g.Count() })
            .OrderByDescending(x => x.Amount)
            .ToListAsync(ct);

        return Ok(new { Year = targetYear, Teams = teamSpend });
    }
}
