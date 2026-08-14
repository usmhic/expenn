using Expenn.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Expenn.Api.Controllers;

[ApiController]
[Route("api/search")]
[Authorize]
public class SearchController(AppDbContext db) : ControllerBase
{
    private string UserId => User.FindFirst("sub")?.Value ?? string.Empty;
    private string OrgId => User.FindFirst("org_id")?.Value ?? string.Empty;
    private string Role => User.FindFirst("role")?.Value ?? "traveler";
    private bool IsManager => Role is "owner" or "admin" or "manager";

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string q, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
            return Ok(new { trips = Array.Empty<object>(), expenses = Array.Empty<object>() });

        var lower = q.ToLowerInvariant();

        var tripQuery = db.Trips.Where(t =>
            t.OrganizationId == OrgId && t.DeletedAt == null &&
            (t.Name.ToLower().Contains(lower) || t.Destination.ToLower().Contains(lower)));

        if (!IsManager)
            tripQuery = tripQuery.Where(t => t.Travelers.Any(tt => tt.UserId == UserId));

        var trips = await tripQuery
            .Select(t => new { t.Id, t.Name, t.Destination, t.Status, t.StartDate })
            .Take(10)
            .ToListAsync(ct);

        var expQuery = db.Expenses.Where(e =>
            e.OrganizationId == OrgId && e.DeletedAt == null &&
            (e.Merchant.ToLower().Contains(lower) || e.Category.ToLower().Contains(lower)));

        if (!IsManager)
            expQuery = expQuery.Where(e => e.UserId == UserId);

        var expenses = await expQuery
            .Select(e => new { e.Id, e.Merchant, e.Amount, e.Currency, e.Category, e.Status, e.ExpenseDate })
            .Take(10)
            .ToListAsync(ct);

        return Ok(new { trips, expenses });
    }
}
