using System.ComponentModel.DataAnnotations.Schema;

namespace Expenn.Api.Data.Entities;

[Table("organization")]
public class Organization
{
    [Column("id")] public string Id { get; set; } = Guid.NewGuid().ToString();
    [Column("name")] public string Name { get; set; } = string.Empty;
    [Column("slug")] public string Slug { get; set; } = string.Empty;
    [Column("logo")] public string? Logo { get; set; }
    [Column("account_type")] public string AccountType { get; set; } = "company";
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    [Column("updated_at")] public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<Member> Members { get; set; } = [];
    public ICollection<Team> Teams { get; set; } = [];
    public ICollection<Trip> Trips { get; set; } = [];
}
