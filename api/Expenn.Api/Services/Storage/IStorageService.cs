namespace Expenn.Api.Services.Storage;

public record UploadResult(string Key, string Url, long Size, string MimeType);

public interface IStorageService
{
    Task<UploadResult> UploadAsync(Stream stream, string fileName, string mimeType, string orgId, string userId, string prefix, CancellationToken ct = default);
    Task DeleteAsync(string key, CancellationToken ct = default);
    string GetPublicUrl(string key);
}
