using Expenn.Api.Application.Common;
using Expenn.Api.DTOs.Routing;

namespace Expenn.Api.Services.Routing;

/// <summary>
/// Place search and route planning. Coordinates are [lon, lat] pairs (GeoJSON order).
/// Every call returns a <see cref="Result{T}"/> with a message safe to show to users.
/// </summary>
public interface IRoutingService
{
    /// <summary>False when no provider API key is configured; calls then fail with <see cref="RoutingErrors.NotConfigured"/>.</summary>
    bool IsEnabled { get; }

    Task<Result<List<PlaceDto>>> SearchPlacesAsync(
        string text, double? focusLat, double? focusLon, int size, CancellationToken ct = default);

    /// <summary>The nearest place, or a successful null when the provider knows none.</summary>
    Task<Result<PlaceDto?>> ReversePlaceAsync(double lat, double lon, CancellationToken ct = default);

    Task<Result<RouteOptionsDto>> GetDirectionsAsync(
        string profile, IReadOnlyList<double[]> coordinates, bool alternatives, CancellationToken ct = default);

    /// <summary>
    /// Visiting order of <paramref name="stops"/> as 0-based indices into it. The vehicle starts at
    /// <paramref name="start"/> and ends at <paramref name="end"/> when given (at least one is required).
    /// </summary>
    Task<Result<List<int>>> OptimizeOrderAsync(
        string profile, double[]? start, double[]? end, IReadOnlyList<double[]> stops, CancellationToken ct = default);
}

public static class RoutingErrors
{
    public const string NotConfigured = "Route planning is not configured. Set OpenRouteService__ApiKey.";
}
