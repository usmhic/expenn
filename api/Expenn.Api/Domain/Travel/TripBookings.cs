using Expenn.Api.Application.Common;

namespace Expenn.Api.Domain.Travel;

/// <summary>Who a trip is for. Drives defaults (approvals, who pays) and how costs are shared.</summary>
public static class TripKinds
{
    public const string Business = "business";
    public const string Personal = "personal";
    public const string Family = "family";
    public const string Group = "group";

    public static readonly IReadOnlyList<string> All = [Business, Personal, Family, Group];
    public const int MaxCompanions = 20;

    public static Result Check(string? kind) =>
        kind is not null && All.Contains(kind)
            ? Result.Ok()
            : Result.Fail($"Unknown trip type. Use one of: {string.Join(", ", All)}");

    /// <summary>Trims, de-duplicates and caps companion names; blanks are dropped.</summary>
    public static Result<List<string>> NormalizeCompanions(IEnumerable<string>? names)
    {
        var list = (names ?? [])
            .Select(n => n?.Trim() ?? string.Empty)
            .Where(n => n.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        if (list.Count > MaxCompanions) return Result<List<string>>.Fail($"A trip can list at most {MaxCompanions} companions");
        if (list.Any(n => n.Length > 80)) return Result<List<string>>.Fail("Keep companion names under 80 characters");
        return list;
    }
}

/// <summary>Vocabulary and validation for trip bookings (flights, stays, rentals, tickets).</summary>
public static class TripBookings
{
    public static readonly IReadOnlyList<string> Kinds = ["flight", "hotel", "car", "train", "bus", "ferry", "activity", "other"];
    public static readonly IReadOnlyList<string> Statuses = ["planned", "booked", "cancelled"];
    public static readonly IReadOnlyList<string> Payers = ["personal", "company"];
    public const int MaxPerTrip = 100;

    /// <summary>The expense category a booking's receipt is filed under.</summary>
    public static string CategoryFor(string kind) => kind switch
    {
        "flight" => "Airfare",
        "hotel" => "Lodging",
        "car" or "train" or "bus" or "ferry" => "Ground transport",
        "activity" => "Conference & training",
        _ => "Other",
    };

    public sealed record Draft(
        string Kind, string Status, string Title, string? Provider, string? Reference,
        string? Origin, string? Destination, DateTime? StartsAt, DateTime? EndsAt,
        decimal Amount, string Currency, string PaidBy, int Travelers, string? BookingUrl, string? Notes);

    public static Result<Draft> Validate(
        string? kind, string? status, string? title, string? provider, string? reference,
        string? origin, string? destination, DateTime? startsAt, DateTime? endsAt,
        decimal? amount, string? currency, string? paidBy, int? travelers, string? bookingUrl, string? notes)
    {
        kind = kind?.Trim().ToLowerInvariant();
        if (kind is null || !Kinds.Contains(kind)) return Fail($"Choose a booking type: {string.Join(", ", Kinds)}");
        status = string.IsNullOrWhiteSpace(status) ? "booked" : status.Trim().ToLowerInvariant();
        if (!Statuses.Contains(status)) return Fail($"Status must be one of: {string.Join(", ", Statuses)}");
        paidBy = string.IsNullOrWhiteSpace(paidBy) ? "personal" : paidBy.Trim().ToLowerInvariant();
        if (!Payers.Contains(paidBy)) return Fail("Paid by must be personal or company");

        title = title?.Trim();
        if (string.IsNullOrEmpty(title)) return Fail("Give the booking a title, e.g. \"LH 400 Frankfurt → New York\"");
        if (title.Length > 200) return Fail("Keep the title under 200 characters");

        var value = amount ?? 0;
        if (value < 0) return Fail("The price can't be negative");
        if (value > 10_000_000) return Fail("That price looks too large");
        currency = currency?.Trim().ToUpperInvariant();
        if (string.IsNullOrEmpty(currency) || currency.Length is < 3 or > 5) return Fail("Use a 3-letter currency code, e.g. USD");

        if (startsAt is not null && endsAt is not null && endsAt < startsAt) return Fail("The booking ends before it starts");
        var people = travelers ?? 1;
        if (people is < 1 or > 50) return Fail("A booking covers between 1 and 50 travelers");

        bookingUrl = Clean(bookingUrl);
        if (bookingUrl is not null
            && !(Uri.TryCreate(bookingUrl, UriKind.Absolute, out var uri) && (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp)))
            return Fail("The booking link must be a web address starting with https://");

        return new Draft(kind, status, title, Clip(provider, 120), Clip(reference, 80), Clip(origin, 200), Clip(destination, 200),
            startsAt, endsAt, decimal.Round(value, 2), currency, paidBy, people, bookingUrl, Clip(notes, 1000));
    }

    private static Result<Draft> Fail(string error) => Result<Draft>.Fail(error);
    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private static string? Clip(string? value, int max)
    {
        var clean = Clean(value);
        return clean is null ? null : clean.Length <= max ? clean : clean[..max];
    }
}
