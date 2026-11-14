namespace Expenn.Api.DTOs.Trips;

public record TripBookingDto(
    string Id,
    string TripId,
    string Kind,
    string Status,
    string Title,
    string? Provider,
    string? Reference,
    string? Origin,
    string? Destination,
    DateTime? StartsAt,
    DateTime? EndsAt,
    decimal Amount,
    string Currency,
    string PaidBy,
    int Travelers,
    string? BookingUrl,
    string? Notes,
    string? CreatedByName,
    string? ExpenseId,
    string? ExpenseStatus,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);

/// <summary>Creates or replaces a booking. Times are local to where the booking happens.</summary>
public record SaveBookingRequest(
    string? Kind,
    string? Status,
    string? Title,
    string? Provider,
    string? Reference,
    string? Origin,
    string? Destination,
    DateTime? StartsAt,
    DateTime? EndsAt,
    decimal? Amount,
    string? Currency,
    string? PaidBy,
    int? Travelers,
    string? BookingUrl,
    string? Notes
);
