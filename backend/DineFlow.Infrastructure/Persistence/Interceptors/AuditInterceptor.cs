using DineFlow.Domain.Common;
using DineFlow.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace DineFlow.Infrastructure.Persistence.Interceptors;

public class AuditInterceptor : SaveChangesInterceptor
{
    private const string System = "system";

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        Stamp(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken ct = default)
    {
        Stamp(eventData.Context);
        return base.SavingChangesAsync(eventData, result, ct);
    }

    private static void Stamp(DbContext? context)
    {
        if (context is null) return;
        var now = DateTime.UtcNow;
        foreach (var entry in context.ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                // Write through the EF change-tracker API so we never trigger CLR
                // property-change notifications that can cause EF to re-snapshot the
                // entity and overwrite the server-generated RowVersion original value
                // with the C# initializer default (byte[0]), which would make the
                // optimistic-concurrency WHERE clause match 0 rows.
                entry.CurrentValues[nameof(BaseEntity.CreatedAt)] = now;
                entry.CurrentValues[nameof(BaseEntity.UpdatedAt)] = now;
                if (string.IsNullOrEmpty(entry.CurrentValues[nameof(BaseEntity.CreatedBy)] as string))
                    entry.CurrentValues[nameof(BaseEntity.CreatedBy)] = System;
                if (string.IsNullOrEmpty(entry.CurrentValues[nameof(BaseEntity.UpdatedBy)] as string))
                    entry.CurrentValues[nameof(BaseEntity.UpdatedBy)] = System;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.CurrentValues[nameof(BaseEntity.UpdatedAt)] = now;
            }
        }
    }
}
