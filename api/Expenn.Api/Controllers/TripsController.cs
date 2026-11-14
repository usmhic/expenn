using Expenn.Api.Application.Common;
using Expenn.Api.Application.Travel;
using Expenn.Api.Data;
using Expenn.Api.Data.Entities;
using Expenn.Api.Domain.Events;
using Expenn.Api.Domain.Travel;
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

        // Project only the columns a list needs: the full route geometry stays in the database.
        var trips = await query
            .OrderBy(t => t.StartDate)
            .Select(t => new Trip
            {
                Id = t.Id, OrganizationId = t.OrganizationId, TeamId = t.TeamId, Name = t.Name,
                Destination = t.Destination, StartDate = t.StartDate, EndDate = t.EndDate, Budget = t.Budget,
                Currency = t.Currency, Status = t.Status, CreatedAt = t.CreatedAt, UpdatedAt = t.UpdatedAt,
                Kind = t.Kind, Companions = t.Companions,
                RouteDistanceMeters = t.RouteDistanceMeters, RouteDurationSeconds = t.RouteDurationSeconds,
                RoutePreview = t.RoutePreview,
            })
            .ToListAsync(ct);

        var ids = trips.Select(t => t.Id).ToList();
        var stops = await LoadStopPointsAsync(ids, ct);
        var counts = await CountTravelersAsync(ids, ct);
        return Ok(trips.Select(t => ToDto(t, stops.GetValueOrDefault(t.Id), counts.GetValueOrDefault(t.Id))).ToList());
    }

    // ── Get trip by ID ────────────────────────────────────────────────────────

    [HttpGet("{id}")]
    public async Task<ActionResult<TripDto>> GetById(string id, CancellationToken ct)
    {
        var trip = await db.Trips
            .Include(t => t.Travelers)
            .FirstOrDefaultAsync(t => t.Id == id && t.OrganizationId == currentUser.OrgId && t.DeletedAt == null, ct);

        if (trip is null) return NotFound();

        var allowed = currentUser.IsAdmin || trip.Travelers.Any(tt => tt.UserId == currentUser.UserId);
        if (!allowed && currentUser.Role == "manager")
        {
            var managed = await GetManagedTeamIdsAsync(ct);
            allowed = trip.TeamId != null && managed.Contains(trip.TeamId);
        }
        if (!allowed) return Forbid();

        var stops = await LoadStopPointsAsync([trip.Id], ct);
        return Ok(ToDto(trip, stops.GetValueOrDefault(trip.Id), trip.Travelers.Count));
    }

    // ── Create trip ───────────────────────────────────────────────────────────

    [HttpPost]
    public async Task<ActionResult<TripDto>> Create([FromBody] CreateTripRequest req, CancellationToken ct)
    {
        // In a personal workspace the traveler plans their own trips; company trips are created by managers.
        var isPersonal = await db.Organizations.AnyAsync(o => o.Id == currentUser.OrgId && o.AccountType == "personal", ct);
        if (!currentUser.IsManager && !isPersonal) return Forbid();

        if (string.IsNullOrWhiteSpace(req.Name) || string.IsNullOrWhiteSpace(req.Destination))
            return BadRequest(new { error = "Give the trip a name and a destination" });

        if (!DateTime.TryParse(req.StartDate, out var start) || !DateTime.TryParse(req.EndDate, out var end))
            return BadRequest(new { error = "Invalid date format" });

        if (end < start) return BadRequest(new { error = "End date must be after the start date" });
        if (req.Budget < 0) return BadRequest(new { error = "Budget can't be negative" });

        var kind = string.IsNullOrWhiteSpace(req.Kind) ? (isPersonal ? TripKinds.Personal : TripKinds.Business) : req.Kind.Trim().ToLowerInvariant();
        var kindCheck = TripKinds.Check(kind);
        if (kindCheck.IsFailure) return BadRequest(new { error = kindCheck.Error });
        var companions = TripKinds.NormalizeCompanions(req.Companions);
        if (companions.IsFailure) return BadRequest(new { error = companions.Error });

        var team = string.IsNullOrEmpty(req.TeamId) && isPersonal
            ? await db.Teams.Where(t => t.OrganizationId == currentUser.OrgId).OrderBy(t => t.CreatedAt).FirstOrDefaultAsync(ct)
            : await db.Teams.FirstOrDefaultAsync(t => t.Id == req.TeamId && t.OrganizationId == currentUser.OrgId, ct);
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
            Kind = kind,
            Companions = companions.Value,
        };
        db.Trips.Add(trip);
        await db.SaveChangesAsync(ct);

        var travelerIds = (req.TravelerUserIds ?? []).Distinct().Where(x => !string.IsNullOrEmpty(x)).ToList();
        if (isPersonal && !travelerIds.Contains(currentUser.UserId)) travelerIds.Add(currentUser.UserId);
        var assigned = 0;
        if (travelerIds.Count > 0)
        {
            // Only members of this workspace can be assigned.
            var validUsers = await db.Members
                .Where(m => m.OrganizationId == currentUser.OrgId && travelerIds.Contains(m.UserId))
                .Select(m => m.UserId)
                .ToListAsync(ct);
            db.TripTravelers.AddRange(validUsers.Select(uid => new TripTraveler
            {
                OrganizationId = currentUser.OrgId,
                TripId = trip.Id,
                UserId = uid,
            }));
            await db.SaveChangesAsync(ct);
            assigned = validUsers.Count;
        }

        return CreatedAtAction(nameof(GetById), new { id = trip.Id }, ToDto(trip, stops: null, assigned));
    }

    // ── Edit trip details ─────────────────────────────────────────────────────

    /// <summary>
    /// Edits name, destination, dates, budget, currency, trip type and companions. Company trips are
    /// edited by admins and the owning team's managers; in a personal workspace the trip's travelers edit it.
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<TripDto>> Update(string id, [FromBody] UpdateTripRequest req, CancellationToken ct)
    {
        var trip = await db.Trips.Include(t => t.Travelers)
            .FirstOrDefaultAsync(t => t.Id == id && t.OrganizationId == currentUser.OrgId && t.DeletedAt == null, ct);
        if (trip is null) return NotFound();

        var isPersonal = await db.Organizations.AnyAsync(o => o.Id == currentUser.OrgId && o.AccountType == "personal", ct);
        var allowed = isPersonal
            ? currentUser.IsAdmin || trip.Travelers.Any(tt => tt.UserId == currentUser.UserId)
            : currentUser.IsAdmin;
        if (!allowed && !isPersonal && currentUser.Role == "manager")
        {
            var managed = await GetManagedTeamIdsAsync(ct);
            allowed = trip.TeamId != null && managed.Contains(trip.TeamId);
        }
        if (!allowed) return Forbid();

        if (req.Name is not null)
        {
            if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest(new { error = "Give the trip a name" });
            trip.Name = req.Name.Trim();
        }
        if (req.Destination is not null)
        {
            if (string.IsNullOrWhiteSpace(req.Destination)) return BadRequest(new { error = "Give the trip a destination" });
            trip.Destination = req.Destination.Trim();
        }
        if (req.StartDate is not null)
        {
            if (!DateTime.TryParse(req.StartDate, out var start)) return BadRequest(new { error = "Invalid start date" });
            trip.StartDate = new DateTimeOffset(start, TimeSpan.Zero);
        }
        if (req.EndDate is not null)
        {
            if (!DateTime.TryParse(req.EndDate, out var end)) return BadRequest(new { error = "Invalid end date" });
            trip.EndDate = new DateTimeOffset(end, TimeSpan.Zero);
        }
        if (trip.EndDate < trip.StartDate) return BadRequest(new { error = "End date must be after the start date" });
        if (req.Budget is not null)
        {
            if (req.Budget < 0) return BadRequest(new { error = "Budget can't be negative" });
            trip.Budget = req.Budget.Value;
        }
        if (req.Currency is not null)
        {
            var currency = req.Currency.Trim().ToUpperInvariant();
            if (currency.Length is < 3 or > 5) return BadRequest(new { error = "Use a 3-letter currency code, e.g. USD" });
            trip.Currency = currency;
        }
        if (req.Kind is not null)
        {
            var kind = req.Kind.Trim().ToLowerInvariant();
            var check = TripKinds.Check(kind);
            if (check.IsFailure) return BadRequest(new { error = check.Error });
            trip.Kind = kind;
        }
        if (req.Companions is not null)
        {
            var companions = TripKinds.NormalizeCompanions(req.Companions);
            if (companions.IsFailure) return BadRequest(new { error = companions.Error });
            trip.Companions = companions.Value;
        }

        trip.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        var stops = await LoadStopPointsAsync([trip.Id], ct);
        return Ok(ToDto(trip, stops.GetValueOrDefault(trip.Id), trip.Travelers.Count));
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

        var stops = await LoadStopPointsAsync([trip.Id], ct);
        var counts = await CountTravelersAsync([trip.Id], ct);
        return Ok(ToDto(trip, stops.GetValueOrDefault(trip.Id), counts.GetValueOrDefault(trip.Id)));
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

    private sealed record StopPoint(string TripId, string Name, double Longitude, double Latitude);

    /// <summary>One query for the stops of all listed trips, grouped per trip in position order.</summary>
    private async Task<Dictionary<string, List<StopPoint>>> LoadStopPointsAsync(List<string> tripIds, CancellationToken ct)
    {
        if (tripIds.Count == 0) return [];
        var points = await db.TripStops
            .Where(s => tripIds.Contains(s.TripId))
            .OrderBy(s => s.TripId).ThenBy(s => s.Position)
            .Select(s => new StopPoint(s.TripId, s.Name, s.Longitude, s.Latitude))
            .ToListAsync(ct);
        return points.GroupBy(p => p.TripId).ToDictionary(g => g.Key, g => g.ToList());
    }

    private async Task<Dictionary<string, int>> CountTravelersAsync(List<string> tripIds, CancellationToken ct)
    {
        if (tripIds.Count == 0) return [];
        return await db.TripTravelers
            .Where(tt => tripIds.Contains(tt.TripId))
            .GroupBy(tt => tt.TripId)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, ct);
    }

    private static TripDto ToDto(Trip t, List<StopPoint>? stops, int travelerCount)
    {
        stops ??= [];
        var preview = TripRouteStore.ReadPreview(t.RoutePreview)
            ?? (stops.Count >= 2 ? stops.Select(s => new[] { s.Longitude, s.Latitude }).ToList() : null);

        return new TripDto(
            t.Id, t.OrganizationId, t.TeamId, t.Name, t.Destination,
            t.StartDate, t.EndDate, t.Budget, t.Currency, t.Status, t.CreatedAt, t.UpdatedAt,
            stops.Count, t.RouteDistanceMeters, t.RouteDurationSeconds,
            TripItinerary.Summarize(stops.Select(s => s.Name).ToList()), preview,
            t.Kind, t.Companions, travelerCount);
    }
}
