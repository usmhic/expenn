namespace Expenn.Api.DTOs.Trips;

public record CreateTripRequest(
    string TeamId,
    string Name,
    string Destination,
    string StartDate,
    string EndDate,
    decimal Budget,
    string Currency,
    string Status = "draft",
    List<string>? TravelerUserIds = null
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
    DateTimeOffset UpdatedAt
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
