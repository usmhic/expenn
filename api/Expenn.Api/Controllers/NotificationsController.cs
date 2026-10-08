using Expenn.Api.Data;
using Expenn.Api.Domain.Expenses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Expenn.Api.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController(AppDbContext db) : ControllerBase
{
    private string UserId => User.FindFirst("sub")?.Value ?? string.Empty;
    private string OrgId => User.FindFirst("org_id")?.Value ?? string.Empty;
    private string Role => User.FindFirst("role")?.Value ?? "traveler";
    private bool IsManager => Role is "owner" or "admin" or "manager";

    /// <summary>
    /// Action counts for the bell. Managers see their review queue; everyone sees
    /// their own expenses that need attention (sent back, never submitted, or awaiting payment).
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        int pendingApprovals = 0;
        int pendingExpenses = 0;
        int awaitingPayment = 0;

        if (IsManager)
        {
            pendingApprovals = await db.TravelApprovals
                .Where(a => a.OrganizationId == OrgId && a.Status == "requested" && a.DeletedAt == null)
                .CountAsync(ct);

            pendingExpenses = await db.Expenses
                .Where(e => e.OrganizationId == OrgId && e.Status == ExpenseStatus.Submitted && e.DeletedAt == null)
                .CountAsync(ct);

            awaitingPayment = await db.Expenses
                .Where(e => e.OrganizationId == OrgId && e.Status == ExpenseStatus.Approved && e.Reimbursable && e.DeletedAt == null)
                .CountAsync(ct);
        }

        var mine = await db.Expenses
            .Where(e => e.OrganizationId == OrgId && e.UserId == UserId && e.DeletedAt == null
                     && (e.Status == ExpenseStatus.Rejected || e.Status == ExpenseStatus.Draft))
            .GroupBy(e => e.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        return Ok(new
        {
            pendingApprovals,
            pendingExpenses,
            awaitingPayment,
            rejectedExpenses = mine.FirstOrDefault(x => x.Status == ExpenseStatus.Rejected)?.Count ?? 0,
            draftExpenses = mine.FirstOrDefault(x => x.Status == ExpenseStatus.Draft)?.Count ?? 0,
        });
    }
}
