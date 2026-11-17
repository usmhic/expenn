namespace Expenn.Api.Domain.Travel;

/// <summary>
/// Adds up everything a trip costs: logged receipts plus bookings that have no receipt yet.
/// A booking with a receipt is counted once, through the receipt. Rejected receipts and cancelled
/// bookings don't count. Amounts in the trip's currency are totalled; other currencies are listed
/// separately and never converted silently.
/// </summary>
public static class TripCosts
{
    public sealed record BookingLine(string Id, string Kind, string Status, decimal Amount, string Currency, string PaidBy);

    public sealed record ExpenseLine(
        string Id, string? BookingId, string UserId, string UserName, string Category,
        decimal Amount, string Currency, string Status, bool Reimbursable);

    public sealed record Slice(string Key, string Label, decimal Amount);

    public sealed record Summary(
        string Currency,
        decimal Budget,
        decimal Spent,
        decimal Booked,
        decimal Planned,
        decimal Total,
        decimal Remaining,
        int PartySize,
        int Days,
        decimal PerPerson,
        decimal PerDay,
        decimal PaidPersonally,
        decimal PaidByCompany,
        decimal ReimbursementPending,
        decimal ReimbursementOwed,
        decimal Reimbursed,
        int ReceiptCount,
        int BookingCount,
        int BookingsWithoutReceipt,
        List<Slice> ByCategory,
        List<Slice> ByPerson,
        List<Slice> OtherCurrencies);

    public static Summary Calculate(
        string currency, decimal budget, DateTimeOffset start, DateTimeOffset end, int partySize,
        IReadOnlyCollection<BookingLine> bookings, IReadOnlyCollection<ExpenseLine> expenses)
    {
        var counted = expenses.Where(e => e.Status != "rejected").ToList();
        var covered = counted.Where(e => e.BookingId is not null).Select(e => e.BookingId!).ToHashSet();
        var openBookings = bookings.Where(b => b.Status != "cancelled" && !covered.Contains(b.Id)).ToList();

        bool InTrip(string c) => string.Equals(c, currency, StringComparison.OrdinalIgnoreCase);
        var tripExpenses = counted.Where(e => InTrip(e.Currency)).ToList();
        var tripBookings = openBookings.Where(b => InTrip(b.Currency)).ToList();

        var spent = tripExpenses.Sum(e => e.Amount);
        var booked = tripBookings.Where(b => b.Status == "booked").Sum(b => b.Amount);
        var planned = tripBookings.Where(b => b.Status == "planned").Sum(b => b.Amount);
        var total = spent + booked + planned;
        var people = Math.Max(1, partySize);
        var days = Math.Max(1, (int)Math.Round((end.Date - start.Date).TotalDays) + 1);

        var byCategory = tripExpenses.Select(e => (e.Category, e.Amount))
            .Concat(tripBookings.Select(b => (TripBookings.CategoryFor(b.Kind), b.Amount)))
            .GroupBy(x => string.IsNullOrWhiteSpace(x.Item1) ? "Other" : x.Item1)
            .Select(g => new Slice(g.Key, g.Key, g.Sum(x => x.Amount)))
            .Where(s => s.Amount > 0)
            .OrderByDescending(s => s.Amount)
            .ToList();

        var byPerson = tripExpenses
            .GroupBy(e => e.UserId)
            .Select(g => new Slice(g.Key, g.First().UserName, g.Sum(e => e.Amount)))
            .OrderByDescending(s => s.Amount)
            .ToList();

        var other = counted.Where(e => !InTrip(e.Currency)).Select(e => (e.Currency, e.Amount))
            .Concat(openBookings.Where(b => !InTrip(b.Currency)).Select(b => (b.Currency, b.Amount)))
            .GroupBy(x => x.Item1.ToUpperInvariant())
            .Select(g => new Slice(g.Key, g.Key, g.Sum(x => x.Amount)))
            .OrderBy(s => s.Key)
            .ToList();

        var reimbursable = tripExpenses.Where(e => e.Reimbursable).ToList();
        var paidPersonally = reimbursable.Sum(e => e.Amount) + tripBookings.Where(b => b.PaidBy == "personal").Sum(b => b.Amount);

        return new Summary(
            currency.ToUpperInvariant(), budget, spent, booked, planned, total, budget - total,
            people, days, Round(total / people), Round(total / days),
            paidPersonally, total - paidPersonally,
            reimbursable.Where(e => e.Status == "submitted").Sum(e => e.Amount),
            reimbursable.Where(e => e.Status == "approved").Sum(e => e.Amount),
            reimbursable.Where(e => e.Status == "reimbursed").Sum(e => e.Amount),
            counted.Count, bookings.Count(b => b.Status != "cancelled"), openBookings.Count(b => b.Status == "booked"),
            byCategory, byPerson, other);
    }

    private static decimal Round(decimal value) => decimal.Round(value, 2, MidpointRounding.AwayFromZero);
}
