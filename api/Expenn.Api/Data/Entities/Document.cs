using System.ComponentModel.DataAnnotations.Schema;

namespace Expenn.Api.Data.Entities;

[Table("documents")]
public class Document
{
    [Column("id")] public string Id { get; set; } = Guid.NewGuid().ToString();
    [Column("organization_id")] public string OrganizationId { get; set; } = string.Empty;
    [Column("user_id")] public string UserId { get; set; } = string.Empty;
    [Column("trip_id")] public string? TripId { get; set; }
    [Column("title")] public string Title { get; set; } = string.Empty;
    [Column("kind")] public string Kind { get; set; } = "other";
    [Column("storage_key")] public string? StorageKey { get; set; }
    [Column("file_url")] public string? FileUrl { get; set; }
    [Column("file_name")] public string? FileName { get; set; }
    [Column("mime_type")] public string? MimeType { get; set; }
    [Column("size")] public int? Size { get; set; }
    [Column("issuer")] public string? Issuer { get; set; }
    [Column("holder_name")] public string? HolderName { get; set; }
    [Column("document_number")] public string? DocumentNumber { get; set; }
    [Column("issue_date")] public DateTimeOffset? IssueDate { get; set; }
    [Column("expiry_date")] public DateTimeOffset? ExpiryDate { get; set; }
    [Column("is_sensitive")] public bool IsSensitive { get; set; }
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    [Column("updated_at")] public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    [Column("deleted_at")] public DateTimeOffset? DeletedAt { get; set; }

    public Organization Organization { get; set; } = null!;
    public User User { get; set; } = null!;
    public Trip? Trip { get; set; }
}
