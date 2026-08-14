using System.ComponentModel.DataAnnotations.Schema;

namespace Expenn.Api.Data.Entities;

[Table("expenses")]
public class Expense
{
    [Column("id")] public string Id { get; set; } = Guid.NewGuid().ToString();
    [Column("organization_id")] public string OrganizationId { get; set; } = string.Empty;
    [Column("user_id")] public string UserId { get; set; } = string.Empty;
    [Column("trip_id")] public string? TripId { get; set; }
    [Column("merchant")] public string Merchant { get; set; } = string.Empty;
    [Column("amount")] public decimal Amount { get; set; }
    [Column("currency")] public string Currency { get; set; } = "USD";
    [Column("category")] public string Category { get; set; } = string.Empty;
    [Column("expense_date")] public DateTimeOffset ExpenseDate { get; set; }
    [Column("receipt_file_url")] public string? ReceiptFileUrl { get; set; }
    [Column("status")] public string Status { get; set; } = "draft";
    [Column("notes")] public string? Notes { get; set; }
    [Column("payment_method")] public string? PaymentMethod { get; set; }
    [Column("reimbursable")] public bool Reimbursable { get; set; } = true;
    [Column("extraction", TypeName = "jsonb")] public string? Extraction { get; set; }
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    [Column("updated_at")] public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    [Column("deleted_at")] public DateTimeOffset? DeletedAt { get; set; }

    public Organization Organization { get; set; } = null!;
    public User User { get; set; } = null!;
    public Trip? Trip { get; set; }
    public ICollection<ExpenseComment> Comments { get; set; } = [];
}
