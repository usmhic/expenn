using System.Text.Json;
using Expenn.Api.Data.Entities;
using Expenn.Api.Domain.Travel;
using Expenn.Api.DTOs.Routing;
using Expenn.Api.DTOs.Trips;

namespace Expenn.Api.Application.Travel;

/// <summary>Reads and writes the cached route columns on <see cref="Trip"/> (jsonb as GeoJSON / camelCase JSON).</summary>
public static class TripRouteStore
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static void Apply(Trip trip, RouteDto route, DateTimeOffset now)
    {
        trip.RouteDistanceMeters = route.DistanceMeters;
        trip.RouteDurationSeconds = route.DurationSeconds;
        trip.RouteGeometry = JsonSerializer.Serialize(route.Geometry, Json);
        trip.RouteLegs = JsonSerializer.Serialize(route.Legs, Json);
        trip.RouteBbox = route.Bbox is null ? null : JsonSerializer.Serialize(route.Bbox, Json);
        trip.RoutePreview = JsonSerializer.Serialize(GeoPoints.Downsample(route.Geometry.Coordinates), Json);
        trip.RouteUpdatedAt = now;
    }

    public static void Clear(Trip trip)
    {
        trip.RouteDistanceMeters = null;
        trip.RouteDurationSeconds = null;
        trip.RouteGeometry = null;
        trip.RouteLegs = null;
        trip.RouteBbox = null;
        trip.RoutePreview = null;
        trip.RouteUpdatedAt = null;
    }

    public static RouteDto? Read(Trip trip)
    {
        if (string.IsNullOrEmpty(trip.RouteGeometry)) return null;
        var geometry = JsonSerializer.Deserialize<GeoJsonLineString>(trip.RouteGeometry, Json);
        if (geometry is null) return null;
        return new RouteDto(
            trip.RouteDistanceMeters ?? 0,
            trip.RouteDurationSeconds ?? 0,
            geometry,
            string.IsNullOrEmpty(trip.RouteLegs) ? [] : JsonSerializer.Deserialize<List<RouteLegDto>>(trip.RouteLegs, Json) ?? [],
            string.IsNullOrEmpty(trip.RouteBbox) ? null : JsonSerializer.Deserialize<double[]>(trip.RouteBbox, Json));
    }

    public static List<double[]>? ReadPreview(string? preview) =>
        string.IsNullOrEmpty(preview) ? null : JsonSerializer.Deserialize<List<double[]>>(preview, Json);

    public static TripStopDto ToDto(TripStop s) => new(
        s.Id, s.Position, s.Name, s.Address, s.Latitude, s.Longitude,
        TripItinerary.FormatDate(s.ArriveOn), TripItinerary.FormatDate(s.DepartOn), s.Notes, s.Kind);
}
