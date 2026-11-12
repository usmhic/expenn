using Expenn.Api.DTOs.Routing;

namespace Expenn.Api.DTOs.Trips;

public record TripStopDto(
    string Id,
    int Position,
    string Name,
    string? Address,
    double Latitude,
    double Longitude,
    string? ArriveOn,
    string? DepartOn,
    string? Notes,
    string Kind
);

public record ItineraryDto(
    string TripId,
    string Profile,
    List<TripStopDto> Stops,
    RouteDto? Route,
    DateTimeOffset? RouteUpdatedAt,
    bool RoutingEnabled,
    string? RouteError = null
);

public record ItineraryStopInput(
    string? Id,
    string? Name,
    string? Address,
    double? Latitude,
    double? Longitude,
    string? ArriveOn = null,
    string? DepartOn = null,
    string? Notes = null,
    string? Kind = null
);

public record UpdateItineraryRequest(string? Profile, List<ItineraryStopInput>? Stops, int RouteIndex = 0);
