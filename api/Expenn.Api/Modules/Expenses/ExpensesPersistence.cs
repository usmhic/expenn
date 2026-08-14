using Expenn.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Expenn.Api.Modules.Expenses;

internal static class ExpensesPersistence
{
    internal static void ConfigureExpensesModule(this ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Expense>(entity =>
        {
            entity.ToTable("expenses", DomainSchemas.Expenses);
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Amount).HasColumnType("numeric(12,2)");
            entity.HasIndex(x => new { x.OrganizationId, x.Status }).HasDatabaseName("expenses_org_status_idx");
            entity.HasIndex(x => new { x.UserId, x.ExpenseDate }).HasDatabaseName("expenses_user_date_idx");
            entity.HasOne(x => x.Organization).WithMany().HasForeignKey(x => x.OrganizationId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Trip).WithMany(x => x.Expenses).HasForeignKey(x => x.TripId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ExpenseComment>(entity =>
        {
            entity.ToTable("expense_comment", DomainSchemas.Expenses);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.ExpenseId).HasDatabaseName("expense_comment_expense_idx");
            entity.HasOne(x => x.Expense).WithMany(x => x.Comments).HasForeignKey(x => x.ExpenseId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
