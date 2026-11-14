using System.ComponentModel.DataAnnotations.Schema;

namespace Expenn.Api.Data.Entities;

[Table("trips")]
public class Trip
{
    [Column("id")] public string Id { get; set; } = Guid.NewGuid().ToString();
    [Column("organization_id")] public string OrganizationId { get; set; } = string.Empty;
    [Column("team_id")] public string? TeamId { get; set; }
    [Column("name")] public string Name { get; set; } = string.Empty;
    [Column("destination")] public string Destination { get; set; } = string.Empty;
    [Column("start_date")] public DateTimeOffset StartDate { get; set; }
    [Column("end_date")] public DateTimeOffset EndDate { get; set; }
    [Column("budget")] public decimal Budget { get; set; }
    [Column("currency")] public string Currency { get; set; } = "USD";
    [Column("status")] public string Status { get; set; } = "draft";
    /// <summary>business | personal | family | group — who the trip is for and how costs are shared.</summary>
    [Column("kind")] public string Kind { get; set; } = "business";
    /// <summary>People on the trip who don't have an account, e.g. family members. Count toward per-person costs.</summary>
    [Column("companions")] public List<string> Companions { get; set; } = [];
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    [Column("updated_at")] public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    [Column("deleted_at")] public DateTimeOffset? DeletedAt { get; set; }

    // Itinerary route, computed from the ordered stops by the routing provider.
    [Column("route_profile")] public string RouteProfile { get; set; } = "driving-car";
    [Column("route_distance_m")] public double? RouteDistanceMeters { get; set; }
    [Column("route_duration_s")] public double? RouteDurationSeconds { get; set; }
    [Column("route_geometry", TypeName = "jsonb")] public string? RouteGeometry { get; set; }
    [Column("route_legs", TypeName = "jsonb")] public string? RouteLegs { get; set; }
    [Column("route_bbox", TypeName = "jsonb")] public string? RouteBbox { get; set; }
    [Column("route_preview", TypeName = "jsonb")] public string? RoutePreview { get; set; }
    [Column("route_updated_at")] public DateTimeOffset? RouteUpdatedAt { get; set; }

    public Organization Organization { get; set; } = null!;
    public Team? Team { get; set; }
    public ICollection<TripTraveler> Travelers { get; set; } = [];
    public ICollection<TravelApproval> Approvals { get; set; } = [];
    public ICollection<Expense> Expenses { get; set; } = [];
    public ICollection<TripStop> Stops { get; set; } = [];
    public ICollection<TripBooking> Bookings { get; set; } = [];
}
