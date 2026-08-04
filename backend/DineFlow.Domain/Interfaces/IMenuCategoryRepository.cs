using DineFlow.Domain.Entities;

namespace DineFlow.Domain.Interfaces;

public interface IMenuCategoryRepository
{
    Task<IReadOnlyList<MenuCategory>> GetAllAsync(CancellationToken ct = default);
    Task<MenuCategory?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task AddAsync(MenuCategory category, CancellationToken ct = default);
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
