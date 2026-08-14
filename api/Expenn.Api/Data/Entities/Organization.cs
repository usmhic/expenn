using System.ComponentModel.DataAnnotations.Schema;

namespace Expenn.Api.Data.Entities;

[Table("organization")]
public class Organization
{
    [Column("id")] public string Id { get; set; } = Guid.NewGuid().ToString();
    [Column("name")] public string Name { get; set; } = string.Empty;
    [Column("slug")] public string Slug { get; set; } = string.Empty;
    [Column("logo")] public string? Logo { get; set; }
    [Column("account_type")] public string AccountType { get; set; } = "company";
    [Column("plan")] public string Plan { get; set; } = "free";
    [Column("billing_status")] public string BillingStatus { get; set; } = "free";
    [Column("paddle_customer_id")] public string? PaddleCustomerId { get; set; }
    [Column("paddle_subscription_id")] public string? PaddleSubscriptionId { get; set; }
    [Column("paid_seats")] public int PaidSeats { get; set; }
    [Column("current_period_ends_at")] public DateTimeOffset? CurrentPeriodEndsAt { get; set; }
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    [Column("updated_at")] public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<Member> Members { get; set; } = [];
    public ICollection<Team> Teams { get; set; } = [];
    public ICollection<Trip> Trips { get; set; } = [];
}
