using Expenn.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Expenn.Api.Modules.Organizations;

internal static class OrganizationsPersistence
{
    internal static void ConfigureOrganizationsModule(this ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Organization>(entity =>
        {
            entity.ToTable("organization", DomainSchemas.Organizations);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.Slug).IsUnique();
        });

        modelBuilder.Entity<Member>(entity =>
        {
            entity.ToTable("member", DomainSchemas.Organizations);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.OrganizationId, x.UserId }).IsUnique().HasDatabaseName("member_org_user_idx");
            entity.HasOne(x => x.Organization).WithMany(x => x.Members).HasForeignKey(x => x.OrganizationId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.User).WithMany(x => x.Memberships).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Invitation>(entity =>
        {
            entity.ToTable("invitation", DomainSchemas.Organizations);
            entity.HasKey(x => x.Id);
            entity.HasOne(x => x.Organization).WithMany().HasForeignKey(x => x.OrganizationId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Inviter).WithMany().HasForeignKey(x => x.InviterId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Team>(entity =>
        {
            entity.ToTable("team", DomainSchemas.Organizations);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.OrganizationId, x.Name }).IsUnique().HasDatabaseName("team_org_name_idx");
            entity.HasOne(x => x.Organization).WithMany(x => x.Teams).HasForeignKey(x => x.OrganizationId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TeamMember>(entity =>
        {
            entity.ToTable("team_member", DomainSchemas.Organizations);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.TeamId, x.UserId }).IsUnique().HasDatabaseName("team_member_team_user_idx");
            entity.HasOne(x => x.Team).WithMany(x => x.TeamMembers).HasForeignKey(x => x.TeamId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
