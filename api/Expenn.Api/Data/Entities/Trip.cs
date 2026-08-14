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
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    [Column("updated_at")] public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    [Column("deleted_at")] public DateTimeOffset? DeletedAt { get; set; }

    public Organization Organization { get; set; } = null!;
    public Team? Team { get; set; }
    public ICollection<TripTraveler> Travelers { get; set; } = [];
    public ICollection<TravelApproval> Approvals { get; set; } = [];
    public ICollection<Expense> Expenses { get; set; } = [];
}
