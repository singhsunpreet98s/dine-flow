using DineFlow.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DineFlow.Infrastructure.Persistence.Configurations;

public class RestaurantTableConfiguration : IEntityTypeConfiguration<RestaurantTable>
{
    public void Configure(EntityTypeBuilder<RestaurantTable> builder)
    {
        builder.ToTable("RestaurantTables");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.TableNumber).IsRequired().HasMaxLength(20);
        builder.Property(t => t.Shape).HasConversion<string>();
        builder.Property(t => t.Status).HasConversion<string>();
        builder.HasQueryFilter(t => !t.IsDeleted);
    }
}
