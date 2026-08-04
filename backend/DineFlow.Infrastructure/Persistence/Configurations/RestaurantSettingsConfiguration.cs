using DineFlow.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DineFlow.Infrastructure.Persistence.Configurations;

public class RestaurantSettingsConfiguration : IEntityTypeConfiguration<RestaurantSettings>
{
    public void Configure(EntityTypeBuilder<RestaurantSettings> builder)
    {
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Name).IsRequired().HasMaxLength(200);
        builder.Property(r => r.ThemeAccentColor).IsRequired().HasMaxLength(50);
        builder.Property(r => r.LogoUrl).HasMaxLength(2048);
        builder.Property(r => r.GstRate).HasColumnType("decimal(5,2)");
        builder.HasQueryFilter(r => !r.IsDeleted);
    }
}
