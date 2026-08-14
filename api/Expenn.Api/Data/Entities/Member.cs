using System.ComponentModel.DataAnnotations.Schema;

namespace Expenn.Api.Data.Entities;

[Table("member")]
public class Member
{
    [Column("id")] public string Id { get; set; } = Guid.NewGuid().ToString();
    [Column("organization_id")] public string OrganizationId { get; set; } = string.Empty;
    [Column("user_id")] public string UserId { get; set; } = string.Empty;
    [Column("role")] public string Role { get; set; } = "traveler";
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Organization Organization { get; set; } = null!;
    public User User { get; set; } = null!;
}
