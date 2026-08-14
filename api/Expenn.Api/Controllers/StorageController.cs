using Expenn.Api.Configuration;
using Expenn.Api.Services.Storage;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Expenn.Api.Controllers;

[ApiController]
[Route("api/storage")]
[Authorize]
public class StorageController(IStorageService storage, IOptions<StorageSettings> storageOpts) : ControllerBase
{
    private static readonly HashSet<string> AllowedMimeTypes =
    [
        "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"
    ];

    private string UserId => User.FindFirst("sub")?.Value ?? string.Empty;
    private string OrgId => User.FindFirst("org_id")?.Value ?? string.Empty;

    [HttpPost("upload")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<IActionResult> Upload(IFormFile file, [FromQuery] string prefix = "uploads", CancellationToken ct = default)
    {
        if (!AllowedMimeTypes.Contains(file.ContentType))
            return BadRequest(new { error = $"File type '{file.ContentType}' is not allowed" });

        var maxBytes = storageOpts.Value.MaxSizeMb * 1024 * 1024;
        if (file.Length > maxBytes)
            return BadRequest(new { error = $"File exceeds maximum size of {storageOpts.Value.MaxSizeMb} MB" });

        await using var stream = file.OpenReadStream();
        var result = await storage.UploadAsync(stream, file.FileName, file.ContentType, OrgId, UserId, prefix, ct);

        return Ok(new { key = result.Key, url = result.Url, size = result.Size, mimeType = result.MimeType });
    }
}
