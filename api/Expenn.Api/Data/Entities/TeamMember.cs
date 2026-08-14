using System.ComponentModel.DataAnnotations.Schema;

namespace Expenn.Api.Data.Entities;

[Table("team_member")]
public class TeamMember
{
    [Column("id")] public string Id { get; set; } = Guid.NewGuid().ToString();
    [Column("team_id")] public string TeamId { get; set; } = string.Empty;
    [Column("user_id")] public string UserId { get; set; } = string.Empty;
    [Column("created_at")] public DateTimeOffset? CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Team Team { get; set; } = null!;
    public User User { get; set; } = null!;
}
