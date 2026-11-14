using System.ComponentModel.DataAnnotations.Schema;

namespace Expenn.Api.Data.Entities;

/// <summary>A flight, stay, rental or ticket booked for a trip. Owned by the Travel module.</summary>
[Table("trip_bookings")]
public class TripBooking
{
    [Column("id")] public string Id { get; set; } = Guid.NewGuid().ToString();
    [Column("organization_id")] public string OrganizationId { get; set; } = string.Empty;
    [Column("trip_id")] public string TripId { get; set; } = string.Empty;
    [Column("created_by_id")] public string? CreatedById { get; set; }
    [Column("kind")] public string Kind { get; set; } = "other";
    [Column("status")] public string Status { get; set; } = "booked";
    [Column("title")] public string Title { get; set; } = string.Empty;
    [Column("provider")] public string? Provider { get; set; }
    [Column("reference")] public string? Reference { get; set; }
    [Column("origin")] public string? Origin { get; set; }
    [Column("destination")] public string? Destination { get; set; }
    /// <summary>Local wall-clock time at the place it happens; no time zone is implied.</summary>
    [Column("starts_at", TypeName = "timestamp without time zone")] public DateTime? StartsAt { get; set; }
    [Column("ends_at", TypeName = "timestamp without time zone")] public DateTime? EndsAt { get; set; }
    [Column("amount")] public decimal Amount { get; set; }
    [Column("currency")] public string Currency { get; set; } = "USD";
    [Column("paid_by")] public string PaidBy { get; set; } = "personal";
    [Column("travelers")] public int Travelers { get; set; } = 1;
    [Column("booking_url")] public string? BookingUrl { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    [Column("updated_at")] public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Trip Trip { get; set; } = null!;
    public User? CreatedBy { get; set; }
}
