using DineFlow.Domain.Entities;
using DineFlow.Domain.Enums;
using DineFlow.Domain.Interfaces;
using DineFlow.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DineFlow.Infrastructure.Repositories;

public class AppUserRepository : IAppUserRepository
{
    private readonly DineFlowDbContext _db;
    public AppUserRepository(DineFlowDbContext db) => _db = db;

    public Task<AppUser?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => _db.AppUsers.FirstOrDefaultAsync(u => u.Id == id, ct);

    public Task<AppUser?> GetByEmailAsync(string email, CancellationToken ct = default)
        => _db.AppUsers.FirstOrDefaultAsync(u => u.Email == email, ct);

    public Task<bool> AdminExistsAsync(CancellationToken ct = default)
        => _db.AppUsers.AnyAsync(u => u.Role == UserRole.Admin, ct);

    public async Task<IReadOnlyList<AppUser>> GetAllActiveAsync(CancellationToken ct = default)
        => await _db.AppUsers.Where(u => u.IsActive).ToListAsync(ct);

    public async Task AddAsync(AppUser user, CancellationToken ct = default)
        => await _db.AppUsers.AddAsync(user, ct);

    public Task<int> SaveChangesAsync(CancellationToken ct = default)
        => _db.SaveChangesAsync(ct);
}
