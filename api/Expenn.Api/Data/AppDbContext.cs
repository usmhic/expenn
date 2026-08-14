using Expenn.Api.Data.Entities;
using Expenn.Api.Modules.Documents;
using Expenn.Api.Modules.Expenses;
using Expenn.Api.Modules.Identity;
using Expenn.Api.Modules.Organizations;
using Expenn.Api.Modules.Travel;
using Microsoft.EntityFrameworkCore;

namespace Expenn.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Session> Sessions => Set<Session>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Verification> Verifications => Set<Verification>();
    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<Member> Members => Set<Member>();
    public DbSet<Invitation> Invitations => Set<Invitation>();
    public DbSet<Team> Teams => Set<Team>();
    public DbSet<TeamMember> TeamMembers => Set<TeamMember>();
    public DbSet<Trip> Trips => Set<Trip>();
    public DbSet<TripTraveler> TripTravelers => Set<TripTraveler>();
    public DbSet<TravelApproval> TravelApprovals => Set<TravelApproval>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<ExpenseComment> ExpenseComments => Set<ExpenseComment>();
    public DbSet<Document> Documents => Set<Document>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ConfigureIdentityModule();
        modelBuilder.ConfigureOrganizationsModule();
        modelBuilder.ConfigureTravelModule();
        modelBuilder.ConfigureExpensesModule();
        modelBuilder.ConfigureDocumentsModule();
    }
}
