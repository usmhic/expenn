using System.ComponentModel.DataAnnotations.Schema;

namespace Expenn.Api.Data.Entities;

[Table("account")]
public class Account
{
    [Column("id")] public string Id { get; set; } = Guid.NewGuid().ToString();
    [Column("account_id")] public string AccountId { get; set; } = string.Empty;
    [Column("provider_id")] public string ProviderId { get; set; } = string.Empty;
    [Column("user_id")] public string UserId { get; set; } = string.Empty;
    [Column("access_token")] public string? AccessToken { get; set; }
    [Column("refresh_token")] public string? RefreshToken { get; set; }
    [Column("id_token")] public string? IdToken { get; set; }
    [Column("access_token_expires_at")] public DateTimeOffset? AccessTokenExpiresAt { get; set; }
    [Column("refresh_token_expires_at")] public DateTimeOffset? RefreshTokenExpiresAt { get; set; }
    [Column("scope")] public string? Scope { get; set; }
    [Column("password")] public string? Password { get; set; }
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    [Column("updated_at")] public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public User User { get; set; } = null!;
}
