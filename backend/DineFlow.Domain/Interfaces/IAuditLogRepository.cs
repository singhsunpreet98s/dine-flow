using DineFlow.Domain.Entities;

namespace DineFlow.Domain.Interfaces;

public interface IAuditLogRepository
{
    Task AddAsync(AuditLog log, CancellationToken ct = default);
}
