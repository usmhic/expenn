using Expenn.Api.Domain.Events;
using MassTransit;

namespace Expenn.Api.Infrastructure.Messaging.Consumers;

/// <summary>
/// Receives ExpenseSubmittedEvent. Extend this to send notifications, trigger
/// approval workflows, sync to an accounting system, etc.
/// </summary>
public class ExpenseSubmittedConsumer(ILogger<ExpenseSubmittedConsumer> logger)
    : IConsumer<ExpenseSubmittedEvent>
{
    public Task Consume(ConsumeContext<ExpenseSubmittedEvent> context)
    {
        var ev = context.Message;
        logger.LogInformation(
            "Expense {ExpenseId} submitted by user {UserId} in org {OrgId} — {Amount} {Currency}",
            ev.ExpenseId, ev.UserId, ev.OrgId, ev.Amount, ev.Currency);

        // TODO: send in-app notification to managers
        // TODO: trigger accounting sync
        return Task.CompletedTask;
    }
}
