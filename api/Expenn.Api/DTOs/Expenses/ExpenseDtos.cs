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
    string? TripName = null
);

public record ReviewExpenseRequest(string Status, string? Notes = null); // approved | rejected | reimbursed

public record ExpenseSummaryDto(
    int Total,
    int Draft,
    int Submitted,
    int Approved,
    int Rejected,
    int Reimbursed,
    decimal TotalAmount
);
