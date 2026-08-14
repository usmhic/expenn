using Expenn.Api.Infrastructure.Messaging.Consumers;
using MassTransit;

namespace Expenn.Api.Infrastructure.Messaging;

public static class MassTransitExtensions
{
    /// <summary>
    /// Registers MassTransit with either RabbitMQ (when Enabled=true) or the in-memory
    /// transport (development / testing). All domain event consumers are registered here.
    /// </summary>
    public static IServiceCollection AddExpennMessaging(
        this IServiceCollection services,
        RabbitMqSettings settings)
    {
        services.AddMassTransit(x =>
        {
            // ── Register all consumers ─────────────────────────────────────────
            x.AddConsumer<ExpenseSubmittedConsumer>();
            x.AddConsumer<ExpenseReviewedConsumer>();
            x.AddConsumer<TravelApprovalRequestedConsumer>();
            x.AddConsumer<TravelApprovalDecidedConsumer>();

            if (settings.Enabled)
            {
                // ── RabbitMQ transport (staging / production) ──────────────────
                x.UsingRabbitMq((ctx, cfg) =>
                {
                    cfg.Host(settings.Host, settings.Port, settings.VirtualHost, h =>
                    {
                        h.Username(settings.Username);
                        h.Password(settings.Password);
                    });

                    // Retry transient failures up to 3 times with 1-second delay
                    cfg.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(1)));

                    // Auto-create queues from consumer registrations
                    cfg.ConfigureEndpoints(ctx);
                });
            }
            else
            {
                // ── In-memory transport (development / testing) ────────────────
                // Events are processed in-process — no RabbitMQ broker needed.
                x.UsingInMemory((ctx, cfg) => cfg.ConfigureEndpoints(ctx));
            }
        });

        return services;
    }
}
