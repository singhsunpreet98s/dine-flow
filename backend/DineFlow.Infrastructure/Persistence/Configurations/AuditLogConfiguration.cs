using DineFlow.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DineFlow.Infrastructure.Persistence.Configurations;

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.HasKey(a => a.Id);
        builder.Property(a => a.EntityType).IsRequired().HasMaxLength(100);
        builder.Property(a => a.Action).IsRequired().HasMaxLength(100);
        builder.Property(a => a.PerformedBy).IsRequired().HasMaxLength(200);
        builder.Property(a => a.FromStatus).HasConversion<string?>();
        builder.Property(a => a.ToStatus).HasConversion<string?>();
        builder.Property(a => a.PaymentMode).HasConversion<string?>();
        // Audit logs are never soft-deleted — no query filter
    }
}
