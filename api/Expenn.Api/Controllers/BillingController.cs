using Expenn.Api.Configuration;
using Expenn.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Expenn.Api.Controllers;

/// <summary>
/// Server-to-server billing writes. Called by the web app's Paddle webhook
/// route, not by user-facing clients — guarded by a shared secret instead of
/// a user JWT since there is no signed-in user in a webhook request.
/// </summary>
[ApiController]
[Route("api/internal/billing")]
[AllowAnonymous]
public class BillingController(AppDbContext db, IOptions<BillingSettings> settings) : ControllerBase
{
    [HttpPatch("{orgId}")]
    public async Task<IActionResult> UpdateBilling(string orgId, [FromBody] UpdateBillingRequest req, CancellationToken ct)
    {
        var expected = settings.Value.WebhookSecret;
        if (string.IsNullOrEmpty(expected) || Request.Headers["X-Internal-Secret"] != expected)
            return Unauthorized();

        var org = await db.Organizations.FindAsync([orgId], ct);
        if (org is null) return NotFound();

        if (req.Plan is not null) org.Plan = req.Plan;
        if (req.BillingStatus is not null) org.BillingStatus = req.BillingStatus;
        if (req.PaidSeats is not null) org.PaidSeats = req.PaidSeats.Value;
        if (req.PaddleCustomerId is not null) org.PaddleCustomerId = req.PaddleCustomerId;
        if (req.PaddleSubscriptionId is not null) org.PaddleSubscriptionId = req.PaddleSubscriptionId;
        if (req.CurrentPeriodEndsAt is not null) org.CurrentPeriodEndsAt = req.CurrentPeriodEndsAt;
        org.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}

public record UpdateBillingRequest(
    string? Plan = null,
    string? BillingStatus = null,
    int? PaidSeats = null,
    string? PaddleCustomerId = null,
    string? PaddleSubscriptionId = null,
    DateTimeOffset? CurrentPeriodEndsAt = null
);
