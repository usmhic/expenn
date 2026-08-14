namespace Expenn.Api.Domain.Events;

public record ExpenseSubmittedEvent(
    string ExpenseId,
    string UserId,
    string OrgId,
    decimal Amount,
    string Currency,
    string? TripId,
    DateTimeOffset OccurredAt
);

public record ExpenseReviewedEvent(
    string ExpenseId,
    string ReviewerId,
    string OrgId,
    string NewStatus,
    DateTimeOffset OccurredAt
);
