using DineFlow.Domain.Entities;

namespace DineFlow.Domain.Interfaces;

public interface IMenuItemRepository
{
    Task<(IReadOnlyList<MenuItem> Items, int TotalCount)> GetPagedAsync(Guid? categoryId, string? search, int page, int pageSize, CancellationToken ct = default);
    Task<MenuItem?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task AddAsync(MenuItem item, CancellationToken ct = default);
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
