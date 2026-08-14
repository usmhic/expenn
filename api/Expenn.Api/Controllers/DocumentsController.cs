using Expenn.Api.Data;
using Expenn.Api.Data.Entities;
using Expenn.Api.DTOs.Documents;
using Expenn.Api.Services.Storage;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Expenn.Api.Controllers;

[ApiController]
[Route("api/documents")]
[Authorize]
public class DocumentsController(AppDbContext db, IStorageService storage) : ControllerBase
{
    private string UserId => User.FindFirst("sub")?.Value ?? string.Empty;
    private string OrgId => User.FindFirst("org_id")?.Value ?? string.Empty;
    private string Role => User.FindFirst("role")?.Value ?? "traveler";
    private bool IsAdmin => Role is "owner" or "admin";

    [HttpGet]
    public async Task<ActionResult<List<DocumentDto>>> List([FromQuery] string? kind, CancellationToken ct)
    {
        var query = db.Documents.Where(d => d.OrganizationId == OrgId && d.DeletedAt == null);

        if (!IsAdmin)
            query = query.Where(d => d.UserId == UserId);

        if (!string.IsNullOrEmpty(kind))
            query = query.Where(d => d.Kind == kind);

        var docs = await query
            .OrderByDescending(d => d.CreatedAt)
            .Select(d => ToDto(d))
            .ToListAsync(ct);

        return Ok(docs);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<DocumentDto>> GetById(string id, CancellationToken ct)
    {
        var doc = await db.Documents.FirstOrDefaultAsync(d => d.Id == id && d.OrganizationId == OrgId && d.DeletedAt == null, ct);
        if (doc is null) return NotFound();
        if (!IsAdmin && doc.UserId != UserId) return Forbid();
        return Ok(ToDto(doc));
    }

    [HttpPost]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<ActionResult<DocumentDto>> Create([FromForm] CreateDocumentRequest req, IFormFile? file, CancellationToken ct)
    {
        var doc = new Document
        {
            OrganizationId = OrgId,
            UserId = UserId,
            TripId = req.TripId,
            Title = req.Title,
            Kind = req.Kind,
            Issuer = req.Issuer,
            HolderName = req.HolderName,
            DocumentNumber = req.DocumentNumber,
            IssueDate = req.IssueDate,
            ExpiryDate = req.ExpiryDate,
            IsSensitive = req.IsSensitive,
        };

        if (file is not null)
        {
            await using var stream = file.OpenReadStream();
            var result = await storage.UploadAsync(stream, file.FileName, file.ContentType, OrgId, UserId, "documents", ct);
            doc.StorageKey = result.Key;
            doc.FileUrl = result.Url;
            doc.FileName = file.FileName;
            doc.MimeType = file.ContentType;
            doc.Size = (int)result.Size;
        }

        db.Documents.Add(doc);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetById), new { id = doc.Id }, ToDto(doc));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        var doc = await db.Documents.FirstOrDefaultAsync(d => d.Id == id && d.OrganizationId == OrgId && d.DeletedAt == null, ct);
        if (doc is null) return NotFound();
        if (!IsAdmin && doc.UserId != UserId) return Forbid();

        doc.DeletedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        if (doc.StorageKey is not null)
            await storage.DeleteAsync(doc.StorageKey, ct);

        return NoContent();
    }

    private static DocumentDto ToDto(Document d) => new(
        d.Id, d.OrganizationId, d.UserId, d.TripId, d.Title, d.Kind,
        d.FileUrl, d.FileName, d.MimeType, d.Size,
        d.Issuer, d.HolderName, d.DocumentNumber,
        d.IssueDate, d.ExpiryDate, d.IsSensitive, d.CreatedAt);
}
