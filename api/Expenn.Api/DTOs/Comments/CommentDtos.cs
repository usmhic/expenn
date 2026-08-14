namespace Expenn.Api.DTOs.Comments;

public record CreateCommentRequest(string ExpenseId, string Body);

public record CommentDto(
    string Id,
    string ExpenseId,
    string UserId,
    string AuthorName,
    string Body,
    DateTimeOffset CreatedAt
);
