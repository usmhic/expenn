using Expenn.Api.Application.Common;
using Expenn.Api.Data;
using Expenn.Api.Data.Entities;
using Expenn.Api.Domain.Events;
using Expenn.Api.DTOs.Trips;
using MassTransit;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Expenn.Api.Controllers;

[ApiController]
[Route("api/trips")]
[Authorize]
public class TripsController(
    AppDbContext db,
    ICurrentUserContext currentUser,
    IPublishEndpoint bus) : ControllerBase
{
    // ── List trips ────────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<ActionResult<List<TripDto>>> List(
        [FromQuery] string? status, [FromQuery] string? teamId, [FromQuery] bool mine = false, CancellationToken ct = default)
    {
        var query = db.Trips.Where(t => t.OrganizationId == currentUser.OrgId && t.DeletedAt == null);

        if (!string.IsNullOrEmpty(status)) query = query.Where(t => t.Status == status);
        if (!string.IsNullOrEmpty(teamId)) query = query.Where(t => t.TeamId == teamId);

        if (!currentUser.IsManager || mine)
        {
            query = query.Where(t => t.Travelers.Any(tt => tt.UserId == currentUser.UserId));
        }
        else if (currentUser.Role == "manager")
        {
            var managedTeamIds = await GetManagedTeamIdsAsync(ct);
            query = query.Where(t => t.TeamId != null && managedTeamIds.Contains(t.TeamId));
        }

        return Ok(await query
            .OrderBy(t => t.StartDate)
            .Select(t => ToDto(t))
            .ToListAsync(ct));
    }

    // ── Get trip by ID ────────────────────────────────────────────────────────

    [HttpGet("{id}")]
    public async Task<ActionResult<TripDto>> GetById(string id, CancellationToken ct)
    {
        var trip = await db.Trips
            .Include(t => t.Travelers)
            .FirstOrDefaultAsync(t => t.Id == id && t.OrganizationId == currentUser.OrgId && t.DeletedAt == null, ct);

        if (trip is null) return NotFound();
        if (currentUser.IsAdmin) return Ok(ToDto(trip));

        if (currentUser.Role == "manager")
        {
            var managed = await GetManagedTeamIdsAsync(ct);
            if (trip.TeamId != null && managed.Contains(trip.TeamId)) return Ok(ToDto(trip));
        }

        if (!trip.Travelers.Any(tt => tt.UserId == currentUser.UserId)) return Forbid();
        return Ok(ToDto(trip));
    }

    // ── Create trip ───────────────────────────────────────────────────────────

    [HttpPost]
    public async Task<ActionResult<TripDto>> Create([FromBody] CreateTripRequest req, CancellationToken ct)
    {
        if (!currentUser.IsManager) return Forbid();

        if (!DateTime.TryParse(req.StartDate, out var start) || !DateTime.TryParse(req.EndDate, out var end))
            return BadRequest(new { error = "Invalid date format" });

        if (end < start) return BadRequest(new { error = "End date must be after the start date" });

        var team = await db.Teams.FirstOrDefaultAsync(t => t.Id == req.TeamId && t.OrganizationId == currentUser.OrgId, ct);
        if (team is null) return BadRequest(new { error = "Select a valid team before creating a trip" });

        if (currentUser.Role == "manager")
        {
            var managed = await GetManagedTeamIdsAsync(ct);
            if (!managed.Contains(team.Id)) return Forbid();
        }

        var trip = new Trip
        {
            OrganizationId = currentUser.OrgId,
            TeamId = team.Id,
            Name = req.Name,
            Destination = req.Destination,
            StartDate = new DateTimeOffset(start, TimeSpan.Zero),
            EndDate = new DateTimeOffset(end, TimeSpan.Zero),
            Budget = req.Budget,
            Currency = req.Currency.ToUpperInvariant(),
            Status = req.Status,
        };
        db.Trips.Add(trip);
        await db.SaveChangesAsync(ct);

        var travelerIds = (req.TravelerUserIds ?? []).Distinct().Where(x => !string.IsNullOrEmpty(x)).ToList();
        if (travelerIds.Count > 0)
        {
            var validUsers = await db.Users.Where(u => travelerIds.Contains(u.Id)).Select(u => u.Id).ToListAsync(ct);
            db.TripTravelers.AddRange(validUsers.Select(uid => new TripTraveler
            {
                OrganizationId = currentUser.OrgId,
                TripId = trip.Id,
                UserId = uid,
            }));
            await db.SaveChangesAsync(ct);
        }

        return CreatedAtAction(nameof(GetById), new { id = trip.Id }, ToDto(trip));
    }

    // ── Travelers ─────────────────────────────────────────────────────────────

    [HttpGet("{tripId}/travelers")]
    public async Task<ActionResult<List<TripTravelerDto>>> GetTravelers(string tripId, CancellationToken ct)
    {
        var travelers = await db.TripTravelers
            .Where(tt => tt.TripId == tripId && tt.OrganizationId == currentUser.OrgId)
            .Include(tt => tt.User)
            .OrderBy(tt => tt.User.Name)
            .Select(tt => new TripTravelerDto(tt.Id, tt.TripId, tt.UserId, tt.User.Name, tt.User.Email, tt.CreatedAt))
            .ToListAsync(ct);

        return Ok(travelers);
    }

    [HttpPut("{tripId}/travelers")]
    public async Task<IActionResult> AssignTravelers(string tripId, [FromBody] AssignTravelersRequest req, CancellationToken ct)
    {
        if (!currentUser.IsManager) return Forbid();

        var trip = await db.Trips.FirstOrDefaultAsync(
            t => t.Id == tripId && t.OrganizationId == currentUser.OrgId && t.DeletedAt == null, ct);
        if (trip is null) return NotFound();

        if (currentUser.Role == "manager")
        {
            var managed = await GetManagedTeamIdsAsync(ct);
            if (trip.TeamId == null || !managed.Contains(trip.TeamId)) return Forbid();
        }

        var existing = await db.TripTravelers.Where(tt => tt.TripId == tripId).ToListAsync(ct);
        db.TripTravelers.RemoveRange(existing);

        var travelerIds = req.TravelerUserIds.Distinct().Where(x => !string.IsNullOrEmpty(x)).ToList();
        if (travelerIds.Count > 0)
        {
            db.TripTravelers.AddRange(travelerIds.Select(uid => new TripTraveler
            {
                OrganizationId = currentUser.OrgId,
                TripId = tripId,
                UserId = uid,
            }));
        }

        await db.SaveChangesAsync(ct);
        return Ok(new { assignedCount = travelerIds.Count });
    }

    // ── Status ────────────────────────────────────────────────────────────────

    [HttpPatch("{id}/status")]
    public async Task<ActionResult<TripDto>> UpdateStatus(string id, [FromBody] UpdateTripStatusRequest req, CancellationToken ct)
    {
        if (!currentUser.IsManager) return Forbid();

        var trip = await db.Trips.FirstOrDefaultAsync(t => t.Id == id && t.OrganizationId == currentUser.OrgId, ct);
        if (trip is null) return NotFound();

        if (currentUser.Role == "manager")
        {
            var managed = await GetManagedTeamIdsAsync(ct);
            if (trip.TeamId == null || !managed.Contains(trip.TeamId)) return Forbid();
        }

        trip.Status = req.Status;
        trip.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        return Ok(ToDto(trip));
    }

    // ── Approvals ─────────────────────────────────────────────────────────────

    [HttpGet("approvals")]
    public async Task<ActionResult<List<ApprovalDto>>> GetApprovals(
        [FromQuery] string? tripId, [FromQuery] bool mine = false, [FromQuery] string? status = null, CancellationToken ct = default)
    {
        var query = db.TravelApprovals
            .Where(a => a.OrganizationId == currentUser.OrgId && a.DeletedAt == null)
            .Include(a => a.User)
            .Include(a => a.Trip)
            .AsQueryable();

        if (!string.IsNullOrEmpty(tripId)) query = query.Where(a => a.TripId == tripId);
        if (!string.IsNullOrEmpty(status)) query = query.Where(a => a.Status == status);

        if (!currentUser.IsManager || mine)
        {
            query = query.Where(a => a.UserId == currentUser.UserId);
        }
        else if (currentUser.Role == "manager")
        {
            var managed = await GetManagedTeamIdsAsync(ct);
            query = query.Where(a => a.Trip.TeamId != null && managed.Contains(a.Trip.TeamId));
        }

        return Ok(await query
            .OrderBy(a => a.CreatedAt)
            .Select(a => new ApprovalDto(
                a.Id, a.OrganizationId, a.TripId, a.Trip.Name, a.Trip.Destination,
                a.UserId, a.User.Name, a.User.Email, a.Status, a.Purpose, a.Notes,
                a.DecidedAt, a.CreatedAt))
            .ToListAsync(ct));
    }

    [HttpPost("{tripId}/approvals")]
    public async Task<ActionResult<ApprovalDto>> RequestApproval(string tripId, [FromBody] RequestApprovalRequest req, CancellationToken ct)
    {
        var isAssigned = await db.TripTravelers
            .AnyAsync(tt => tt.TripId == tripId && tt.UserId == currentUser.UserId && tt.OrganizationId == currentUser.OrgId, ct);

        if (!isAssigned) return Forbid();

        var existing = await db.TravelApprovals
            .FirstOrDefaultAsync(a => a.TripId == tripId && a.UserId == currentUser.UserId, ct);

        TravelApproval approval;
        if (existing is not null)
        {
            existing.Status = "requested";
            existing.Purpose = req.Purpose;
            existing.Notes = req.Notes;
            existing.DecidedById = null;
            existing.DecidedAt = null;
            existing.UpdatedAt = DateTimeOffset.UtcNow;
            approval = existing;
        }
        else
        {
            approval = new TravelApproval
            {
                OrganizationId = currentUser.OrgId,
                TripId = tripId,
                UserId = currentUser.UserId,
                Purpose = req.Purpose,
                Notes = req.Notes,
            };
            db.TravelApprovals.Add(approval);
        }

        await db.SaveChangesAsync(ct);

        var user = await db.Users.FindAsync([currentUser.UserId], ct);
        var trip = await db.Trips.FindAsync([tripId], ct);

        await bus.Publish(new TravelApprovalRequestedEvent(
            approval.Id, tripId, trip?.Name ?? string.Empty,
            currentUser.UserId, currentUser.OrgId, DateTimeOffset.UtcNow), ct);

        return Ok(new ApprovalDto(approval.Id, approval.OrganizationId, approval.TripId,
            trip?.Name ?? string.Empty, trip?.Destination ?? string.Empty,
            approval.UserId, user?.Name ?? string.Empty, user?.Email ?? string.Empty,
            approval.Status, approval.Purpose, approval.Notes, approval.DecidedAt, approval.CreatedAt));
    }

    [HttpPatch("approvals/{approvalId}")]
    public async Task<ActionResult<ApprovalDto>> ReviewApproval(string approvalId, [FromBody] ReviewApprovalRequest req, CancellationToken ct)
    {
        if (!currentUser.IsManager) return Forbid();

        var approval = await db.TravelApprovals
            .Include(a => a.Trip)
            .Include(a => a.User)
            .FirstOrDefaultAsync(a => a.Id == approvalId && a.OrganizationId == currentUser.OrgId && a.DeletedAt == null, ct);

        if (approval is null) return NotFound();

        if (currentUser.Role == "manager")
        {
            var managed = await GetManagedTeamIdsAsync(ct);
            if (approval.Trip.TeamId == null || !managed.Contains(approval.Trip.TeamId)) return Forbid();
        }

        approval.Status = req.Status;
        approval.DecidedById = currentUser.UserId;
        approval.DecidedAt = DateTimeOffset.UtcNow;
        approval.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        await bus.Publish(new TravelApprovalDecidedEvent(
            approval.Id, approval.TripId, approval.UserId, approval.OrganizationId,
            req.Status, currentUser.UserId, DateTimeOffset.UtcNow), ct);

        return Ok(new ApprovalDto(approval.Id, approval.OrganizationId, approval.TripId,
            approval.Trip.Name, approval.Trip.Destination,
            approval.UserId, approval.User.Name, approval.User.Email,
            approval.Status, approval.Purpose, approval.Notes, approval.DecidedAt, approval.CreatedAt));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Task<List<string>> GetManagedTeamIdsAsync(CancellationToken ct) =>
        db.TeamMembers
            .Where(tm => tm.UserId == currentUser.UserId)
            .Select(tm => tm.TeamId)
            .ToListAsync(ct);

    private static TripDto ToDto(Trip t) => new(
        t.Id, t.OrganizationId, t.TeamId, t.Name, t.Destination,
        t.StartDate, t.EndDate, t.Budget, t.Currency, t.Status, t.CreatedAt, t.UpdatedAt);
}
