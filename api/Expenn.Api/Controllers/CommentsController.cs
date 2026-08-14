using Expenn.Api.Data;
using Expenn.Api.Data.Entities;
using Expenn.Api.DTOs.Comments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Expenn.Api.Controllers;

[ApiController]
[Route("api/comments")]
[Authorize]
public class CommentsController(AppDbContext db) : ControllerBase
{
    private string UserId => User.FindFirst("sub")?.Value ?? string.Empty;
    private string OrgId => User.FindFirst("org_id")?.Value ?? string.Empty;
    private string Role => User.FindFirst("role")?.Value ?? "traveler";
    private bool IsManager => Role is "owner" or "admin" or "manager";

    [HttpGet]
    public async Task<ActionResult<List<CommentDto>>> ListForTrip([FromQuery] string tripId, CancellationToken ct)
    {
        // Get all expense IDs for this trip scoped to the org
        var expenseIds = await db.Expenses
            .Where(e => e.TripId == tripId && e.OrganizationId == OrgId && e.DeletedAt == null)
            .Select(e => e.Id)
            .ToListAsync(ct);

        if (expenseIds.Count == 0) return Ok(Array.Empty<CommentDto>());

        var query = db.ExpenseComments
            .Where(c => expenseIds.Contains(c.ExpenseId))
            .Include(c => c.User);

        // Non-managers can only see comments on their own expenses
        if (!IsManager)
        {
            var myExpenseIds = await db.Expenses
                .Where(e => expenseIds.Contains(e.Id) && e.UserId == UserId)
                .Select(e => e.Id)
                .ToListAsync(ct);
            query = db.ExpenseComments
                .Where(c => myExpenseIds.Contains(c.ExpenseId))
                .Include(c => c.User);
        }

        var comments = await query
            .OrderBy(c => c.CreatedAt)
            .Select(c => new CommentDto(c.Id, c.ExpenseId, c.UserId, c.User.Name, c.Body, c.CreatedAt))
            .ToListAsync(ct);

        return Ok(comments);
    }

    [HttpPost]
    public async Task<ActionResult<CommentDto>> Create([FromBody] CreateCommentRequest req, CancellationToken ct)
    {
        // Verify the expense belongs to this org
        var expense = await db.Expenses
            .FirstOrDefaultAsync(e => e.Id == req.ExpenseId && e.OrganizationId == OrgId && e.DeletedAt == null, ct);

        if (expense is null) return NotFound();

        // Non-managers can only comment on their own expenses
        if (!IsManager && expense.UserId != UserId) return Forbid();

        var comment = new ExpenseComment
        {
            ExpenseId = req.ExpenseId,
            UserId = UserId,
            Body = req.Body,
        };
        db.ExpenseComments.Add(comment);
        await db.SaveChangesAsync(ct);

        var user = await db.Users.FindAsync([UserId], ct);
        return CreatedAtAction(nameof(ListForTrip), new { tripId = expense.TripId },
            new CommentDto(comment.Id, comment.ExpenseId, comment.UserId, user?.Name ?? string.Empty, comment.Body, comment.CreatedAt));
    }
}
