using Expenn.Api.Domain.Events;
using MassTransit;

namespace Expenn.Api.Infrastructure.Messaging.Consumers;

/// <summary>
/// Receives TravelApprovalRequestedEvent. Extend this to notify managers
/// that someone is requesting travel approval.
/// </summary>
public class TravelApprovalRequestedConsumer(ILogger<TravelApprovalRequestedConsumer> logger)
    : IConsumer<TravelApprovalRequestedEvent>
{
    public Task Consume(ConsumeContext<TravelApprovalRequestedEvent> context)
    {
        var ev = context.Message;
        logger.LogInformation(
            "Travel approval requested for trip {TripId} ({TripName}) by user {UserId} in org {OrgId}",
            ev.TripId, ev.TripName, ev.UserId, ev.OrgId);

        // TODO: notify managers with approval link
        return Task.CompletedTask;
    }
}

/// <summary>
/// Receives TravelApprovalDecidedEvent. Extend this to notify travelers of the decision.
/// </summary>
public class TravelApprovalDecidedConsumer(ILogger<TravelApprovalDecidedConsumer> logger)
    : IConsumer<TravelApprovalDecidedEvent>
{
    public Task Consume(ConsumeContext<TravelApprovalDecidedEvent> context)
    {
        var ev = context.Message;
        logger.LogInformation(
            "Travel approval {ApprovalId} decided: {Decision} by {DecidedById} for user {UserId}",
            ev.ApprovalId, ev.Decision, ev.DecidedById, ev.UserId);

        // TODO: notify traveler of decision via email/push
        return Task.CompletedTask;
    }
}
