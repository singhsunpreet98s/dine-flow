using DineFlow.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DineFlow.Infrastructure.Persistence.Configurations;

public class MenuItemConfiguration : IEntityTypeConfiguration<MenuItem>
{
    public void Configure(EntityTypeBuilder<MenuItem> builder)
    {
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Name).IsRequired().HasMaxLength(200);
        builder.Property(m => m.Price).HasColumnType("decimal(18,2)");
        builder.HasOne(m => m.Category).WithMany(c => c.Items).HasForeignKey(m => m.CategoryId);
        builder.HasQueryFilter(m => !m.IsDeleted);
    }
}
