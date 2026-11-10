namespace Expenn.Api.Domain.Events;

public record TravelApprovalRequestedEvent(
    string ApprovalId,
    string TripId,
    string TripName,
    string UserId,
    string OrgId,
    DateTimeOffset OccurredAt
);

public record TravelApprovalDecidedEvent(
    string ApprovalId,
    string TripId,
    string UserId,
    string OrgId,
    string Decision,
    string DecidedById,
    DateTimeOffset OccurredAt
);

public record TripItineraryUpdatedEvent(
    string TripId,
    string OrgId,
    string UserId,
    int StopCount,
    double? DistanceMeters,
    DateTimeOffset OccurredAt
);
