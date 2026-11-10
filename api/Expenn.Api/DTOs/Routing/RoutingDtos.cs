namespace Expenn.Api.DTOs.Routing;

public record PlaceDto(
    string Id,
    string Name,
    string Label,
    string? Locality,
    string? Region,
    string? Country,
    string? CountryCode,
    double Latitude,
    double Longitude,
    string? Kind
);

/// <summary>GeoJSON LineString; coordinates are [lon, lat] pairs.</summary>
public record GeoJsonLineString(string Type, List<double[]> Coordinates)
{
    public static GeoJsonLineString From(List<double[]> coordinates) => new("LineString", coordinates);
}

public record RouteLegDto(double DistanceMeters, double DurationSeconds);

public record RouteDto(
    double DistanceMeters,
    double DurationSeconds,
    GeoJsonLineString Geometry,
    List<RouteLegDto> Legs,
    double[]? Bbox
);

public record RouteOptionsDto(string Profile, List<RouteDto> Routes);

public record RoutingStatusDto(bool Enabled, IReadOnlyList<string> Profiles);

/// <summary>Coordinates are [lon, lat] pairs.</summary>
public record DirectionsRequest(string? Profile, List<double[]>? Coordinates, bool Alternatives = false);

/// <summary>Coordinates are [lon, lat] pairs.</summary>
public record OptimizeRequest(string? Profile, List<double[]>? Coordinates, bool KeepStart = true, bool KeepEnd = true);

public record OptimizeResultDto(List<int> Order);
