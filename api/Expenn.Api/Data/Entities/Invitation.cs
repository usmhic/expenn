using System.ComponentModel.DataAnnotations.Schema;

namespace Expenn.Api.Data.Entities;

[Table("invitation")]
public class Invitation
{
    [Column("id")] public string Id { get; set; } = Guid.NewGuid().ToString();
    [Column("organization_id")] public string OrganizationId { get; set; } = string.Empty;
    [Column("email")] public string Email { get; set; } = string.Empty;
    [Column("role")] public string Role { get; set; } = "traveler";
    [Column("status")] public string Status { get; set; } = "pending";
    [Column("expires_at")] public DateTimeOffset ExpiresAt { get; set; }
    [Column("inviter_id")] public string InviterId { get; set; } = string.Empty;
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    [Column("accepted_at")] public DateTimeOffset? AcceptedAt { get; set; }

    public Organization Organization { get; set; } = null!;
    public User Inviter { get; set; } = null!;
}
