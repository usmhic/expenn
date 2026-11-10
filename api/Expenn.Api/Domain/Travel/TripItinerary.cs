using System.Globalization;
using Expenn.Api.Application.Common;

namespace Expenn.Api.Domain.Travel;

public static class StopKinds
{
    public const string Stop = "stop";
    public const string Stay = "stay";
    public const string Meeting = "meeting";
    public const string Transit = "transit";

    public static readonly IReadOnlyList<string> All = [Stop, Stay, Meeting, Transit];
}

/// <summary>A validated, normalized itinerary stop, ready to persist.</summary>
public readonly record struct StopDraft(
    string? Id, string Name, string? Address, double Latitude, double Longitude,
    DateOnly? ArriveOn, DateOnly? DepartOn, string? Notes, string Kind);

/// <summary>
/// Rules for a trip's ordered stops. Controllers ask this type to validate input and
/// to describe a route instead of encoding the rules inline.
/// </summary>
public static class TripItinerary
{
    public const int MaxStops = 25;
    public const int MaxNameLength = 200;
    public const int MaxAddressLength = 300;
    public const int MaxNotesLength = 1000;
    public const string DateFormat = "yyyy-MM-dd";

    public static Result<StopDraft> NormalizeStop(
        int index, string? id, string? name, string? address, double? latitude, double? longitude,
        string? arriveOn, string? departOn, string? notes, string? kind)
    {
        var label = $"Stop {index + 1}";
        var trimmedName = name?.Trim() ?? string.Empty;
        if (trimmedName.Length == 0) return Result<StopDraft>.Fail($"{label} needs a name");
        if (trimmedName.Length > MaxNameLength) return Result<StopDraft>.Fail($"{label} name must be at most {MaxNameLength} characters");

        var trimmedAddress = string.IsNullOrWhiteSpace(address) ? null : address.Trim();
        if (trimmedAddress?.Length > MaxAddressLength) return Result<StopDraft>.Fail($"{label} address must be at most {MaxAddressLength} characters");

        var trimmedNotes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
        if (trimmedNotes?.Length > MaxNotesLength) return Result<StopDraft>.Fail($"{label} notes must be at most {MaxNotesLength} characters");

        if (latitude is not { } lat || longitude is not { } lon || !GeoPoints.IsValid(lon, lat))
            return Result<StopDraft>.Fail($"{label} needs a latitude in [-90, 90] and a longitude in [-180, 180]");

        var normalizedKind = string.IsNullOrWhiteSpace(kind) ? StopKinds.Stop : kind.Trim().ToLowerInvariant();
        if (!StopKinds.All.Contains(normalizedKind))
            return Result<StopDraft>.Fail($"{label} kind must be one of: {string.Join(", ", StopKinds.All)}");

        if (!TryParseDate(arriveOn, out var arrive)) return Result<StopDraft>.Fail($"{label} arrival date must use {DateFormat}");
        if (!TryParseDate(departOn, out var depart)) return Result<StopDraft>.Fail($"{label} departure date must use {DateFormat}");
        if (arrive is not null && depart is not null && depart < arrive)
            return Result<StopDraft>.Fail($"{label} departure date must be on or after its arrival date");

        return new StopDraft(string.IsNullOrWhiteSpace(id) ? null : id, trimmedName, trimmedAddress, lat, lon,
            arrive, depart, trimmedNotes, normalizedKind);
    }

    public static string? FormatDate(DateOnly? date) => date?.ToString(DateFormat, CultureInfo.InvariantCulture);

    /// <summary>"Berlin → Prague → Vienna"; with more than three stops the middle collapses: "Berlin → +3 → Vienna".</summary>
    public static string? Summarize(IReadOnlyList<string> names) => names.Count switch
    {
        0 => null,
        <= 3 => string.Join(" → ", names),
        _ => $"{names[0]} → +{names.Count - 2} → {names[^1]}",
    };

    private static bool TryParseDate(string? value, out DateOnly? date)
    {
        date = null;
        if (string.IsNullOrWhiteSpace(value)) return true;
        if (!DateOnly.TryParseExact(value.Trim(), DateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
            return false;
        date = parsed;
        return true;
    }
}
