using System.ComponentModel.DataAnnotations.Schema;

namespace Expenn.Api.Data.Entities;

[Table("verification")]
public class Verification
{
    [Column("id")] public string Id { get; set; } = Guid.NewGuid().ToString();
    [Column("identifier")] public string Identifier { get; set; } = string.Empty;
    [Column("value")] public string Value { get; set; } = string.Empty;
    [Column("expires_at")] public DateTimeOffset ExpiresAt { get; set; }
    [Column("created_at")] public DateTimeOffset? CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    [Column("updated_at")] public DateTimeOffset? UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
