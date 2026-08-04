using DineFlow.Domain.Entities;
using DineFlow.Domain.Interfaces;
using DineFlow.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DineFlow.Infrastructure.Repositories;

public class MenuItemRepository : IMenuItemRepository
{
    private readonly DineFlowDbContext _db;
    public MenuItemRepository(DineFlowDbContext db) => _db = db;

    public async Task<(IReadOnlyList<MenuItem> Items, int TotalCount)> GetPagedAsync(
        Guid? categoryId, string? search, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.MenuItems.Include(m => m.Category).AsQueryable();
        if (categoryId.HasValue)
            query = query.Where(m => m.CategoryId == categoryId.Value);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(m => m.Name.Contains(search) || (m.Description != null && m.Description.Contains(search)));
        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(m => m.DisplayOrder).ThenBy(m => m.Name)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync(ct);
        return (items, total);
    }

    public Task<MenuItem?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => _db.MenuItems.Include(m => m.Category).FirstOrDefaultAsync(m => m.Id == id, ct);

    public async Task AddAsync(MenuItem item, CancellationToken ct = default)
        => await _db.MenuItems.AddAsync(item, ct);

    public Task<int> SaveChangesAsync(CancellationToken ct = default)
        => _db.SaveChangesAsync(ct);
}
