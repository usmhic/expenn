using Expenn.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Expenn.Api.Modules.Identity;

internal static class IdentityPersistence
{
    internal static void ConfigureIdentityModule(this ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("user", DomainSchemas.Identity);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.Email).IsUnique();
        });

        modelBuilder.Entity<Session>(entity =>
        {
            entity.ToTable("session", DomainSchemas.Identity);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.Token).IsUnique();
            entity.HasOne(x => x.User).WithMany(x => x.Sessions).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Account>(entity =>
        {
            entity.ToTable("account", DomainSchemas.Identity);
            entity.HasKey(x => x.Id);
            entity.HasOne(x => x.User).WithMany(x => x.Accounts).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Verification>(entity =>
        {
            entity.ToTable("verification", DomainSchemas.Identity);
            entity.HasKey(x => x.Id);
        });
    }
}
