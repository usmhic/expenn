using Expenn.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Expenn.Api.Modules.Travel;

internal static class TravelPersistence
{
    internal static void ConfigureTravelModule(this ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Trip>(entity =>
        {
            entity.ToTable("trips", DomainSchemas.Travel);
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Budget).HasColumnType("numeric(12,2)");
            entity.HasIndex(x => new { x.OrganizationId, x.Status }).HasDatabaseName("trips_org_status_idx");
            entity.HasIndex(x => new { x.TeamId, x.Status }).HasDatabaseName("trips_team_status_idx");
            entity.HasOne(x => x.Organization).WithMany(x => x.Trips).HasForeignKey(x => x.OrganizationId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Team).WithMany().HasForeignKey(x => x.TeamId).OnDelete(DeleteBehavior.SetNull);
            entity.Property(x => x.RouteProfile).HasDefaultValue("driving-car");
        });

        modelBuilder.Entity<TripStop>(entity =>
        {
            entity.ToTable("trip_stops", DomainSchemas.Travel);
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(200);
            entity.Property(x => x.Address).HasMaxLength(300);
            entity.Property(x => x.Notes).HasMaxLength(1000);
            entity.Property(x => x.Kind).HasDefaultValue("stop");
            entity.HasIndex(x => new { x.TripId, x.Position }).HasDatabaseName("trip_stops_trip_position_idx");
            entity.HasOne(x => x.Trip).WithMany(x => x.Stops).HasForeignKey(x => x.TripId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TripTraveler>(entity =>
        {
            entity.ToTable("trip_traveler", DomainSchemas.Travel);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.TripId, x.UserId }).IsUnique().HasDatabaseName("trip_traveler_trip_user_idx");
            entity.HasIndex(x => new { x.OrganizationId, x.UserId }).HasDatabaseName("trip_traveler_org_user_idx");
            entity.HasOne(x => x.Trip).WithMany(x => x.Travelers).HasForeignKey(x => x.TripId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TravelApproval>(entity =>
        {
            entity.ToTable("travel_approvals", DomainSchemas.Travel);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.TripId, x.UserId }).IsUnique().HasDatabaseName("travel_approvals_trip_user_idx");
            entity.HasIndex(x => new { x.OrganizationId, x.Status }).HasDatabaseName("travel_approvals_org_status_idx");
            entity.HasOne(x => x.Trip).WithMany(x => x.Approvals).HasForeignKey(x => x.TripId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.DecidedBy).WithMany().HasForeignKey(x => x.DecidedById).OnDelete(DeleteBehavior.SetNull);
        });
    }
}
