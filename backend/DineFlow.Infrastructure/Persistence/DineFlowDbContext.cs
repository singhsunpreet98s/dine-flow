using DineFlow.Domain.Entities;
using DineFlow.Infrastructure.Persistence.Converters;
using Microsoft.EntityFrameworkCore;

namespace DineFlow.Infrastructure.Persistence;

public class DineFlowDbContext : DbContext
{
    public DineFlowDbContext(DbContextOptions<DineFlowDbContext> options) : base(options) { }

    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<MenuItem> MenuItems => Set<MenuItem>();
    public DbSet<MenuCategory> MenuCategories => Set<MenuCategory>();
    public DbSet<Table> Tables => Set<Table>();
    public DbSet<AppUser> AppUsers => Set<AppUser>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<RestaurantSettings> RestaurantSettings => Set<RestaurantSettings>();
    public DbSet<Floor> Floors => Set<Floor>();
    public DbSet<RestaurantTable> RestaurantTables => Set<RestaurantTable>();

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        // SQL Server returns DateTime without timezone info (Kind = Unspecified).
        // Stamp all DateTime reads as Utc so System.Text.Json serializes with 'Z'.
        configurationBuilder.Properties<DateTime>()
            .HaveConversion<DateTimeUtcConverter>();
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(DineFlowDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
