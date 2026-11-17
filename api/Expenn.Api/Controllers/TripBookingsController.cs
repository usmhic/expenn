using Expenn.Api.Application.Common;
using Expenn.Api.Application.Travel;
using Expenn.Api.Data;
using Expenn.Api.Data.Entities;
using Expenn.Api.Domain.Travel;
using Expenn.Api.DTOs.Trips;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Expenn.Api.Controllers;

/// <summary>
/// Flights, stays, rentals and tickets booked for a trip. Readable and editable by the people who can
/// edit the trip's itinerary: org admins, managers of the owning team, and the trip's travelers.
/// </summary>
[ApiController]
[Route("api/trips/{tripId}/bookings")]
[Authorize]
public class TripBookingsController(AppDbContext db, ICurrentUserContext currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<TripBookingDto>>> List(string tripId, CancellationToken ct)
    {
        var (access, trip) = await db.FindItineraryTripAsync(currentUser, tripId, ct);
        if (access == TripAccess.NotFound) return NotFound();
        if (access == TripAccess.Forbidden) return Forbid();

        return Ok(await ToDtosAsync(db.TripBookings.Where(b => b.TripId == trip!.Id), ct));
    }

    [HttpPost]
    public async Task<ActionResult<TripBookingDto>> Create(string tripId, [FromBody] SaveBookingRequest req, CancellationToken ct)
    {
        var (access, trip) = await db.FindItineraryTripAsync(currentUser, tripId, ct);
        if (access == TripAccess.NotFound) return NotFound();
        if (access == TripAccess.Forbidden) return Forbid();

        if (await db.TripBookings.CountAsync(b => b.TripId == trip!.Id, ct) >= TripBookings.MaxPerTrip)
            return BadRequest(new { error = $"A trip can have at most {TripBookings.MaxPerTrip} bookings" });

        var draft = Validate(req, trip!.Currency);
        if (draft.IsFailure) return BadRequest(new { error = draft.Error });

        var booking = new TripBooking { OrganizationId = currentUser.OrgId, TripId = trip.Id, CreatedById = currentUser.UserId };
        Apply(booking, draft.Value);
        db.TripBookings.Add(booking);
        await db.SaveChangesAsync(ct);

        return Ok((await ToDtosAsync(db.TripBookings.Where(b => b.Id == booking.Id), ct))[0]);
    }

    [HttpPut("{bookingId}")]
    public async Task<ActionResult<TripBookingDto>> Update(string tripId, string bookingId, [FromBody] SaveBookingRequest req, CancellationToken ct)
    {
        var (access, trip) = await db.FindItineraryTripAsync(currentUser, tripId, ct);
        if (access == TripAccess.NotFound) return NotFound();
        if (access == TripAccess.Forbidden) return Forbid();

        var booking = await db.TripBookings.FirstOrDefaultAsync(b => b.Id == bookingId && b.TripId == trip!.Id, ct);
        if (booking is null) return NotFound();

        var draft = Validate(req, trip!.Currency);
        if (draft.IsFailure) return BadRequest(new { error = draft.Error });

        Apply(booking, draft.Value);
        booking.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        return Ok((await ToDtosAsync(db.TripBookings.Where(b => b.Id == booking.Id), ct))[0]);
    }

    /// <summary>Deletes a booking. A receipt filed against it stays on the trip and keeps counting.</summary>
    [HttpDelete("{bookingId}")]
    public async Task<IActionResult> Delete(string tripId, string bookingId, CancellationToken ct)
    {
        var (access, trip) = await db.FindItineraryTripAsync(currentUser, tripId, ct);
        if (access == TripAccess.NotFound) return NotFound();
        if (access == TripAccess.Forbidden) return Forbid();

        var booking = await db.TripBookings.FirstOrDefaultAsync(b => b.Id == bookingId && b.TripId == trip!.Id, ct);
        if (booking is null) return NotFound();

        db.TripBookings.Remove(booking);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static Result<TripBookings.Draft> Validate(SaveBookingRequest req, string tripCurrency) =>
        TripBookings.Validate(
            req.Kind, req.Status, req.Title, req.Provider, req.Reference, req.Origin, req.Destination,
            Unspecified(req.StartsAt), Unspecified(req.EndsAt), req.Amount, req.Currency ?? tripCurrency,
            req.PaidBy, req.Travelers, req.BookingUrl, req.Notes);

    // Booking times are local wall-clock times; drop any offset the client attached.
    private static DateTime? Unspecified(DateTime? value) =>
        value is null ? null : DateTime.SpecifyKind(value.Value, DateTimeKind.Unspecified);

    private static void Apply(TripBooking b, TripBookings.Draft d)
    {
        b.Kind = d.Kind;
        b.Status = d.Status;
        b.Title = d.Title;
        b.Provider = d.Provider;
        b.Reference = d.Reference;
        b.Origin = d.Origin;
        b.Destination = d.Destination;
        b.StartsAt = d.StartsAt;
        b.EndsAt = d.EndsAt;
        b.Amount = d.Amount;
        b.Currency = d.Currency;
        b.PaidBy = d.PaidBy;
        b.Travelers = d.Travelers;
        b.BookingUrl = d.BookingUrl;
        b.Notes = d.Notes;
    }

    private async Task<List<TripBookingDto>> ToDtosAsync(IQueryable<TripBooking> query, CancellationToken ct)
    {
        var bookings = await query
            .OrderBy(b => b.StartsAt == null).ThenBy(b => b.StartsAt).ThenBy(b => b.CreatedAt)
            .Select(b => new { Booking = b, CreatedByName = b.CreatedBy != null ? b.CreatedBy.Name : null })
            .ToListAsync(ct);
        if (bookings.Count == 0) return [];

        // The newest live receipt filed against each booking.
        var ids = bookings.Select(b => b.Booking.Id).ToList();
        var receipts = (await db.Expenses
                .Where(e => e.BookingId != null && ids.Contains(e.BookingId) && e.DeletedAt == null)
                .OrderByDescending(e => e.CreatedAt)
                .Select(e => new { BookingId = e.BookingId!, e.Id, e.Status })
                .ToListAsync(ct))
            .GroupBy(e => e.BookingId)
            .ToDictionary(g => g.Key, g => g.OrderBy(e => e.Status == "rejected").First());

        return bookings.Select(x =>
        {
            var b = x.Booking;
            var receipt = receipts.GetValueOrDefault(b.Id);
            return new TripBookingDto(
                b.Id, b.TripId, b.Kind, b.Status, b.Title, b.Provider, b.Reference, b.Origin, b.Destination,
                b.StartsAt, b.EndsAt, b.Amount, b.Currency, b.PaidBy, b.Travelers, b.BookingUrl, b.Notes,
                x.CreatedByName, receipt?.Id, receipt?.Status, b.CreatedAt, b.UpdatedAt);
        }).ToList();
    }
}
