using Expenn.Api.Application.Common;
using Expenn.Api.Application.Travel;
using Expenn.Api.Data;
using Expenn.Api.Domain.Travel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Expenn.Api.Controllers;

/// <summary>
/// Read model: what a trip costs in total, per person and per day, combining receipts (Expenses)
/// with bookings that have no receipt yet (Travel). Admins, managers of the owning team and personal
/// workspaces see every receipt on the trip; a company traveler sees their own receipts and all bookings.
/// </summary>
[ApiController]
[Route("api/trips/{tripId}/costs")]
[Authorize]
public class TripCostsController(AppDbContext db, ICurrentUserContext currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<TripCosts.Summary>> Get(string tripId, CancellationToken ct)
    {
        var (access, trip) = await db.FindItineraryTripAsync(currentUser, tripId, ct);
        if (access == TripAccess.NotFound) return NotFound();
        if (access == TripAccess.Forbidden) return Forbid();

        var isPersonal = await db.Organizations.AnyAsync(o => o.Id == currentUser.OrgId && o.AccountType == "personal", ct);
        var seesAll = isPersonal || currentUser.IsManager;

        var bookings = await db.TripBookings
            .Where(b => b.TripId == trip!.Id)
            .Select(b => new TripCosts.BookingLine(b.Id, b.Kind, b.Status, b.Amount, b.Currency, b.PaidBy))
            .ToListAsync(ct);

        var expenseQuery = db.Expenses.Where(e => e.TripId == trip!.Id && e.DeletedAt == null);
        if (!seesAll) expenseQuery = expenseQuery.Where(e => e.UserId == currentUser.UserId);
        var expenses = await expenseQuery
            .Select(e => new TripCosts.ExpenseLine(
                e.Id, e.BookingId, e.UserId, e.User.Name, e.Category, e.Amount, e.Currency, e.Status, e.Reimbursable))
            .ToListAsync(ct);

        var travelers = await db.TripTravelers.CountAsync(tt => tt.TripId == trip!.Id, ct);
        var partySize = Math.Max(1, travelers) + trip!.Companions.Count;

        return Ok(TripCosts.Calculate(trip.Currency, trip.Budget, trip.StartDate, trip.EndDate, partySize, bookings, expenses));
    }
}
