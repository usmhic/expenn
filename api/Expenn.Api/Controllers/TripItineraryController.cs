using Expenn.Api.Application.Common;
using Expenn.Api.Application.Travel;
using Expenn.Api.Data;
using Expenn.Api.Data.Entities;
using Expenn.Api.Domain.Events;
using Expenn.Api.Domain.Travel;
using Expenn.Api.DTOs.Trips;
using Expenn.Api.Services.Routing;
using MassTransit;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Expenn.Api.Controllers;

/// <summary>
/// A trip's ordered stops and the cached route through them. Readable and editable by org
/// admins, managers of the owning team, and travelers assigned to the trip.
/// </summary>
[ApiController]
[Route("api/trips/{tripId}/itinerary")]
[Authorize]
public class TripItineraryController(
    AppDbContext db,
    ICurrentUserContext currentUser,
    IRoutingService routing,
    IPublishEndpoint bus) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ItineraryDto>> Get(string tripId, CancellationToken ct)
    {
        var (access, trip) = await db.FindItineraryTripAsync(currentUser, tripId, ct);
        if (access == TripAccess.NotFound) return NotFound();
        if (access == TripAccess.Forbidden) return Forbid();

        var stops = await db.TripStops.Where(s => s.TripId == trip!.Id).OrderBy(s => s.Position).ToListAsync(ct);
        return Ok(ToDto(trip!, stops, routeError: null));
    }

    /// <summary>
    /// Replaces the stops in the given order and recomputes the route. A routing failure never
    /// loses the stops: they are saved, the route is cleared, and <c>routeError</c> explains why.
    /// </summary>
    [HttpPut]
    public async Task<ActionResult<ItineraryDto>> Replace(string tripId, [FromBody] UpdateItineraryRequest req, CancellationToken ct)
    {
        var (access, trip) = await db.FindItineraryTripAsync(currentUser, tripId, ct);
        if (access == TripAccess.NotFound) return NotFound();
        if (access == TripAccess.Forbidden) return Forbid();

        var profile = string.IsNullOrWhiteSpace(req.Profile) ? trip!.RouteProfile : req.Profile.Trim();
        var profileCheck = RouteProfiles.Check(profile);
        if (profileCheck.IsFailure) return BadRequest(new { error = profileCheck.Error });

        var inputs = req.Stops ?? [];
        if (inputs.Count > TripItinerary.MaxStops)
            return BadRequest(new { error = $"A trip can have at most {TripItinerary.MaxStops} stops" });

        var drafts = new List<StopDraft>(inputs.Count);
        for (var i = 0; i < inputs.Count; i++)
        {
            var s = inputs[i];
            if (s is null) return BadRequest(new { error = $"Stop {i + 1} is empty" });
            var draft = TripItinerary.NormalizeStop(i, s.Id, s.Name, s.Address, s.Latitude, s.Longitude,
                s.ArriveOn, s.DepartOn, s.Notes, s.Kind);
            if (draft.IsFailure) return BadRequest(new { error = draft.Error });
            drafts.Add(draft.Value);
        }

        var now = DateTimeOffset.UtcNow;
        var stops = ReplaceStops(trip!, await db.TripStops.Where(s => s.TripId == trip!.Id).ToListAsync(ct), drafts, now);

        trip!.RouteProfile = profile;
        trip.UpdatedAt = now;

        string? routeError = null;
        if (stops.Count >= 2 && routing.IsEnabled)
        {
            var coordinates = stops.Select(s => new[] { s.Longitude, s.Latitude }).ToList();
            var directions = await routing.GetDirectionsAsync(profile, coordinates, alternatives: stops.Count == 2, ct);
            if (directions.IsSuccess)
            {
                var routes = directions.Value.Routes;
                var chosen = req.RouteIndex >= 0 && req.RouteIndex < routes.Count ? routes[req.RouteIndex] : routes[0];
                TripRouteStore.Apply(trip, chosen, now);
            }
            else
            {
                TripRouteStore.Clear(trip);
                routeError = directions.Error;
            }
        }
        else
        {
            TripRouteStore.Clear(trip);
        }

        await db.SaveChangesAsync(ct);

        await bus.Publish(new TripItineraryUpdatedEvent(
            trip.Id, trip.OrganizationId, currentUser.UserId, stops.Count, trip.RouteDistanceMeters, now), ct);

        return Ok(ToDto(trip, stops, routeError));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// <summary>Keeps rows whose ids the client sent back, adds the rest, removes the missing ones.</summary>
    private List<TripStop> ReplaceStops(Trip trip, List<TripStop> existing, List<StopDraft> drafts, DateTimeOffset now)
    {
        var byId = existing.ToDictionary(s => s.Id);
        var kept = new HashSet<string>();
        var result = new List<TripStop>(drafts.Count);

        for (var i = 0; i < drafts.Count; i++)
        {
            var d = drafts[i];
            if (d.Id is null || !byId.TryGetValue(d.Id, out var stop) || !kept.Add(d.Id))
            {
                stop = new TripStop { OrganizationId = trip.OrganizationId, TripId = trip.Id, CreatedAt = now };
                db.TripStops.Add(stop);
            }

            stop.Position = i;
            stop.Name = d.Name;
            stop.Address = d.Address;
            stop.Latitude = d.Latitude;
            stop.Longitude = d.Longitude;
            stop.ArriveOn = d.ArriveOn;
            stop.DepartOn = d.DepartOn;
            stop.Notes = d.Notes;
            stop.Kind = d.Kind;
            stop.UpdatedAt = now;
            result.Add(stop);
        }

        db.TripStops.RemoveRange(existing.Where(s => !kept.Contains(s.Id)));
        return result;
    }

    private ItineraryDto ToDto(Trip trip, List<TripStop> stops, string? routeError) => new(
        trip.Id,
        trip.RouteProfile,
        stops.Select(TripRouteStore.ToDto).ToList(),
        TripRouteStore.Read(trip),
        trip.RouteUpdatedAt,
        routing.IsEnabled,
        routeError);
}
