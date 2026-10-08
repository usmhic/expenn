using Expenn.Api.Application.Common;

namespace Expenn.Api.Domain.Expenses;

public static class ExpenseStatus
{
    public const string Draft = "draft";
    public const string Submitted = "submitted";
    public const string Approved = "approved";
    public const string Rejected = "rejected";
    public const string Reimbursed = "reimbursed";
}

/// <summary>
/// The expense lifecycle: draft → submitted → approved → reimbursed, with
/// submitted → rejected → (edited back to) draft so travelers can fix and resubmit.
/// Controllers ask this type before changing a status instead of encoding the rules inline.
/// </summary>
public static class ExpenseWorkflow
{
    public const int MinRejectionNoteLength = 3;

    /// <summary>Owners may edit or delete an expense until it is submitted, and again after a rejection.</summary>
    public static bool IsEditable(string status) => status is ExpenseStatus.Draft or ExpenseStatus.Rejected;

    public static Result CanSubmit(string status) =>
        status == ExpenseStatus.Draft
            ? Result.Ok()
            : Result.Fail("Only draft expenses can be submitted");

    public static Result CanReview(string from, string to, string? note) => (from, to) switch
    {
        (ExpenseStatus.Submitted, ExpenseStatus.Approved) => Result.Ok(),
        (ExpenseStatus.Submitted, ExpenseStatus.Rejected) when (note?.Trim().Length ?? 0) >= MinRejectionNoteLength => Result.Ok(),
        (ExpenseStatus.Submitted, ExpenseStatus.Rejected) => Result.Fail("Add a short reason so the traveler knows what to fix"),
        (ExpenseStatus.Approved, ExpenseStatus.Reimbursed) => Result.Ok(),
        (_, ExpenseStatus.Approved or ExpenseStatus.Rejected) => Result.Fail($"Only submitted expenses can be {to}"),
        (_, ExpenseStatus.Reimbursed) => Result.Fail("Only approved expenses can be marked reimbursed"),
        _ => Result.Fail("Invalid status"),
    };
}

/// <summary>Review hints surfaced to approvers. Flags never block a transition.</summary>
public static class ExpenseFlags
{
    public const string MissingReceipt = "missing_receipt";
    public const string PossibleDuplicate = "possible_duplicate";

    public readonly record struct Candidate(
        string Id, string UserId, decimal Amount, string Currency, DateTimeOffset ExpenseDate, string? ReceiptFileUrl);

    /// <summary>
    /// Flags expenses that lack a receipt and expenses that share the same traveler, amount,
    /// currency, and calendar day with another expense in <paramref name="pool"/>.
    /// </summary>
    public static Dictionary<string, string[]> Compute(IReadOnlyCollection<Candidate> expenses, IEnumerable<Candidate> pool)
    {
        var duplicateIds = pool
            .GroupBy(c => (c.UserId, c.Amount, Currency: c.Currency.ToUpperInvariant(), Day: c.ExpenseDate.UtcDateTime.Date))
            .Where(g => g.Count() > 1)
            .SelectMany(g => g.Select(c => c.Id))
            .ToHashSet();

        return expenses.ToDictionary(e => e.Id, e =>
        {
            var flags = new List<string>(2);
            if (string.IsNullOrEmpty(e.ReceiptFileUrl)) flags.Add(MissingReceipt);
            if (duplicateIds.Contains(e.Id)) flags.Add(PossibleDuplicate);
            return flags.ToArray();
        });
    }
}
