using System.ComponentModel.DataAnnotations.Schema;

namespace Expenn.Api.Data.Entities;

[Table("expense_comment")]
public class ExpenseComment
{
    [Column("id")] public string Id { get; set; } = Guid.NewGuid().ToString();
    [Column("expense_id")] public string ExpenseId { get; set; } = string.Empty;
    [Column("user_id")] public string UserId { get; set; } = string.Empty;
    [Column("body")] public string Body { get; set; } = string.Empty;
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    [Column("updated_at")] public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Expense Expense { get; set; } = null!;
    public User User { get; set; } = null!;
}
