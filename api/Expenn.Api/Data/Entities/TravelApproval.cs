using System.ComponentModel.DataAnnotations.Schema;

namespace Expenn.Api.Data.Entities;

[Table("travel_approvals")]
public class TravelApproval
{
    [Column("id")] public string Id { get; set; } = Guid.NewGuid().ToString();
    [Column("organization_id")] public string OrganizationId { get; set; } = string.Empty;
    [Column("trip_id")] public string TripId { get; set; } = string.Empty;
    [Column("user_id")] public string UserId { get; set; } = string.Empty;
    [Column("status")] public string Status { get; set; } = "requested";
    [Column("purpose")] public string? Purpose { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("decided_by_id")] public string? DecidedById { get; set; }
    [Column("decided_at")] public DateTimeOffset? DecidedAt { get; set; }
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    [Column("updated_at")] public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    [Column("deleted_at")] public DateTimeOffset? DeletedAt { get; set; }

    public Trip Trip { get; set; } = null!;
    public User User { get; set; } = null!;
    public User? DecidedBy { get; set; }
}
