using Expenn.Api.Application.Common;
using Expenn.Api.Data;
using Expenn.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Expenn.Api.Application.Travel;

public enum TripAccess { NotFound, Forbidden, Allowed }

/// <summary>
/// Who may read and edit a trip's itinerary: org owners and admins, managers of the team that
/// owns the trip, and travelers assigned to it. Unknown or other-org trips are not found.
/// </summary>
public static class TripItineraryAccess
{
    public static async Task<(TripAccess Access, Trip? Trip)> FindItineraryTripAsync(
        this AppDbContext db, ICurrentUserContext currentUser, string tripId, CancellationToken ct)
    {
        var trip = await db.Trips.FirstOrDefaultAsync(
            t => t.Id == tripId && t.OrganizationId == currentUser.OrgId && t.DeletedAt == null, ct);
        if (trip is null) return (TripAccess.NotFound, null);
        if (currentUser.IsAdmin) return (TripAccess.Allowed, trip);

        if (currentUser.Role == "manager" && trip.TeamId is not null
            && await db.TeamMembers.AnyAsync(tm => tm.UserId == currentUser.UserId && tm.TeamId == trip.TeamId, ct))
            return (TripAccess.Allowed, trip);

        var assigned = await db.TripTravelers.AnyAsync(tt => tt.TripId == trip.Id && tt.UserId == currentUser.UserId, ct);
        return assigned ? (TripAccess.Allowed, trip) : (TripAccess.Forbidden, null);
    }
}
