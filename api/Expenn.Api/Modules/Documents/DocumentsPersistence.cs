using Expenn.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Expenn.Api.Modules.Documents;

internal static class DocumentsPersistence
{
    internal static void ConfigureDocumentsModule(this ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Document>(entity =>
        {
            entity.ToTable("documents", DomainSchemas.Documents);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.OrganizationId, x.Kind }).HasDatabaseName("documents_org_kind_idx");
            entity.HasIndex(x => new { x.OrganizationId, x.UserId }).HasDatabaseName("documents_org_user_idx");
            entity.HasOne(x => x.Organization).WithMany().HasForeignKey(x => x.OrganizationId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Trip).WithMany().HasForeignKey(x => x.TripId).OnDelete(DeleteBehavior.SetNull);
        });
    }
}
