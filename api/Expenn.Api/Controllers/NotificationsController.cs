using Expenn.Api.Data;
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

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        int pendingApprovals = 0;
        int pendingExpenses = 0;

        if (IsManager)
        {
            pendingApprovals = await db.TravelApprovals
                .Where(a => a.OrganizationId == OrgId && a.Status == "requested" && a.DeletedAt == null)
                .CountAsync(ct);

            pendingExpenses = await db.Expenses
                .Where(e => e.OrganizationId == OrgId && e.Status == "submitted" && e.DeletedAt == null)
                .CountAsync(ct);
        }

        return Ok(new { pendingApprovals, pendingExpenses });
    }
}
