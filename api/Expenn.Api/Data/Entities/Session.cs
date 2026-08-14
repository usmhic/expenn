using System.ComponentModel.DataAnnotations.Schema;

namespace Expenn.Api.Data.Entities;

[Table("session")]
public class Session
{
    [Column("id")] public string Id { get; set; } = Guid.NewGuid().ToString();
    [Column("expires_at")] public DateTimeOffset ExpiresAt { get; set; }
    [Column("token")] public string Token { get; set; } = string.Empty;
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    [Column("updated_at")] public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    [Column("ip_address")] public string? IpAddress { get; set; }
    [Column("user_agent")] public string? UserAgent { get; set; }
    [Column("user_id")] public string UserId { get; set; } = string.Empty;
    [Column("active_organization_id")] public string? ActiveOrganizationId { get; set; }
    [Column("active_team_id")] public string? ActiveTeamId { get; set; }

    public User User { get; set; } = null!;
}
