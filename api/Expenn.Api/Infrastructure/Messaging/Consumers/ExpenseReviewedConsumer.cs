using Expenn.Api.Domain.Events;
using MassTransit;

namespace Expenn.Api.Infrastructure.Messaging.Consumers;

/// <summary>
/// Receives ExpenseReviewedEvent. Extend this to notify submitters about
/// approval/rejection, trigger reimbursement workflows, etc.
/// </summary>
public class ExpenseReviewedConsumer(ILogger<ExpenseReviewedConsumer> logger)
    : IConsumer<ExpenseReviewedEvent>
{
    public Task Consume(ConsumeContext<ExpenseReviewedEvent> context)
    {
        var ev = context.Message;
        logger.LogInformation(
            "Expense {ExpenseId} marked {Status} by reviewer {ReviewerId} in org {OrgId}",
            ev.ExpenseId, ev.NewStatus, ev.ReviewerId, ev.OrgId);

        // TODO: notify submitter of approval/rejection
        // TODO: trigger reimbursement on "reimbursed" status
        return Task.CompletedTask;
    }
}
