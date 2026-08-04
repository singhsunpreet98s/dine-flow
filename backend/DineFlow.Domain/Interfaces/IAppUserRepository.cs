using DineFlow.Domain.Entities;

namespace DineFlow.Domain.Interfaces;

public interface IAppUserRepository
{
    Task<AppUser?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<AppUser?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task<bool> AdminExistsAsync(CancellationToken ct = default);
    Task<IReadOnlyList<AppUser>> GetAllActiveAsync(CancellationToken ct = default);
    Task AddAsync(AppUser user, CancellationToken ct = default);
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
