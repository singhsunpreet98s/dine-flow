using DineFlow.Domain.Entities;
using DineFlow.Domain.Interfaces;
using DineFlow.Infrastructure.Persistence;

namespace DineFlow.Infrastructure.Repositories;

public class AuditLogRepository : IAuditLogRepository
{
    private readonly DineFlowDbContext _db;
    public AuditLogRepository(DineFlowDbContext db) => _db = db;

    public async Task AddAsync(AuditLog log, CancellationToken ct = default)
        => await _db.AuditLogs.AddAsync(log, ct);
}
