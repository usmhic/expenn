namespace Expenn.Api.DTOs.Documents;

public record CreateDocumentRequest(
    string? TripId,
    string Title,
    string Kind = "other",
    string? Issuer = null,
    string? HolderName = null,
    string? DocumentNumber = null,
    DateTimeOffset? IssueDate = null,
    DateTimeOffset? ExpiryDate = null,
    bool IsSensitive = false
);

public record DocumentDto(
    string Id,
    string OrganizationId,
    string UserId,
    string? TripId,
    string Title,
    string Kind,
    string? FileUrl,
    string? FileName,
    string? MimeType,
    int? Size,
    string? Issuer,
    string? HolderName,
    string? DocumentNumber,
    DateTimeOffset? IssueDate,
    DateTimeOffset? ExpiryDate,
    bool IsSensitive,
    DateTimeOffset CreatedAt
);
