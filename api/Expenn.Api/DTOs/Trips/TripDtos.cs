namespace Expenn.Api.DTOs.Trips;

public record CreateTripRequest(
    string? TeamId,
    string Name,
    string Destination,
    string StartDate,
    string EndDate,
    decimal Budget,
    string Currency,
    string Status = "draft",
    List<string>? TravelerUserIds = null,
    string? Kind = null,
    List<string>? Companions = null
);

/// <summary>Edits a trip's details. Omitted fields keep their current value.</summary>
public record UpdateTripRequest(
    string? Name,
    string? Destination,
    string? StartDate,
    string? EndDate,
    decimal? Budget,
    string? Currency,
    string? Kind,
    List<string>? Companions
);

public record TripDto(
    string Id,
    string OrganizationId,
    string? TeamId,
    string Name,
    string Destination,
    DateTimeOffset StartDate,
    DateTimeOffset EndDate,
    decimal Budget,
    string Currency,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    int StopCount = 0,
    double? RouteDistanceMeters = null,
    double? RouteDurationSeconds = null,
    string? RouteSummary = null,
    List<double[]>? RoutePreview = null,
    string Kind = "business",
    List<string>? Companions = null,
    int TravelerCount = 0
);

public record TripTravelerDto(
    string Id,
    string TripId,
    string UserId,
    string Name,
    string Email,
    DateTimeOffset CreatedAt
);

public record AssignTravelersRequest(List<string> TravelerUserIds);
public record UpdateTripStatusRequest(string Status);

public record RequestApprovalRequest(string? Purpose = null, string? Notes = null);
public record ReviewApprovalRequest(string Status); // "approved" | "rejected"

public record ApprovalDto(
    string Id,
    string OrganizationId,
    string TripId,
    string TripName,
    string Destination,
    string UserId,
    string TravelerName,
    string TravelerEmail,
    string Status,
    string? Purpose,
    string? Notes,
    DateTimeOffset? DecidedAt,
    DateTimeOffset CreatedAt
);
