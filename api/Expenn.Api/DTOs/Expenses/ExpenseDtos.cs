namespace Expenn.Api.DTOs.Expenses;

public record CreateExpenseRequest(
    string? TripId,
    string Merchant,
    decimal Amount,
    string Currency,
    string Category,
    DateTimeOffset ExpenseDate,
    string? Notes,
    string? PaymentMethod,
    bool Reimbursable = true,
    string? ReceiptFileUrl = null
);

/// <summary>Replaces an editable (draft or rejected) expense. A rejected expense returns to draft.</summary>
public record UpdateExpenseRequest(
    string? TripId,
    string Merchant,
    decimal Amount,
    string Currency,
    string Category,
    DateTimeOffset ExpenseDate,
    string? Notes,
    string? PaymentMethod,
    bool Reimbursable = true,
    string? ReceiptFileUrl = null
);

public record ExpenseDto(
    string Id,
    string OrganizationId,
    string UserId,
    string? TripId,
    string Merchant,
    decimal Amount,
    string Currency,
    string Category,
    DateTimeOffset ExpenseDate,
    string? ReceiptFileUrl,
    string Status,
    string? Notes,
    string? PaymentMethod,
    bool Reimbursable,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    string? TripName = null,
    string? TravelerName = null,
    string[]? Flags = null,
    DateTimeOffset? SubmittedAt = null,
    DateTimeOffset? ReviewedAt = null,
    string? ReviewedByName = null,
    string? ReviewNote = null,
    DateTimeOffset? ReimbursedAt = null
);

public record ReviewExpenseRequest(string Status, string? Notes = null); // approved | rejected | reimbursed

public record BulkReviewExpensesRequest(List<string> Ids, string Status, string? Notes = null);

public record BulkReviewFailure(string Id, string Error);

public record BulkReviewResultDto(int Updated, List<BulkReviewFailure> Failed);

public record CurrencyTotalDto(
    string Currency,
    decimal Total,
    decimal Pending,
    decimal Owed,
    decimal Reimbursed
);

public record ExpenseSummaryDto(
    int Total,
    int Draft,
    int Submitted,
    int Approved,
    int Rejected,
    int Reimbursed,
    decimal TotalAmount,
    List<CurrencyTotalDto>? ByCurrency = null
);
