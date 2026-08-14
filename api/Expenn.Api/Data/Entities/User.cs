using System.ComponentModel.DataAnnotations.Schema;

namespace Expenn.Api.Data.Entities;

[Table("user")]
public class User
{
    [Column("id")] public string Id { get; set; } = Guid.NewGuid().ToString();
    [Column("name")] public string Name { get; set; } = string.Empty;
    [Column("email")] public string Email { get; set; } = string.Empty;
    [Column("email_verified")] public bool EmailVerified { get; set; }
    [Column("image")] public string? Image { get; set; }
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    [Column("updated_at")] public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<Session> Sessions { get; set; } = [];
    public ICollection<Account> Accounts { get; set; } = [];
    public ICollection<Member> Memberships { get; set; } = [];
}
