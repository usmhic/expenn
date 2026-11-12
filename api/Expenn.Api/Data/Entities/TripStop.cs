using System.ComponentModel.DataAnnotations.Schema;

namespace Expenn.Api.Data.Entities;

/// <summary>An ordered place on a trip's itinerary. Owned by the Travel module.</summary>
[Table("trip_stops")]
public class TripStop
{
    [Column("id")] public string Id { get; set; } = Guid.NewGuid().ToString();
    [Column("organization_id")] public string OrganizationId { get; set; } = string.Empty;
    [Column("trip_id")] public string TripId { get; set; } = string.Empty;
    [Column("position")] public int Position { get; set; }
    [Column("name")] public string Name { get; set; } = string.Empty;
    [Column("address")] public string? Address { get; set; }
    [Column("latitude")] public double Latitude { get; set; }
    [Column("longitude")] public double Longitude { get; set; }
    [Column("arrive_on")] public DateOnly? ArriveOn { get; set; }
    [Column("depart_on")] public DateOnly? DepartOn { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("kind")] public string Kind { get; set; } = "stop";
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    [Column("updated_at")] public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Trip Trip { get; set; } = null!;
}
