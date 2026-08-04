using DineFlow.Domain.Entities;
using DineFlow.Domain.Interfaces;
using DineFlow.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DineFlow.Infrastructure.Repositories;

public class MenuCategoryRepository : IMenuCategoryRepository
{
    private readonly DineFlowDbContext _db;
    public MenuCategoryRepository(DineFlowDbContext db) => _db = db;

    public async Task<IReadOnlyList<MenuCategory>> GetAllAsync(CancellationToken ct = default)
        => await _db.MenuCategories.OrderBy(c => c.SortOrder).ThenBy(c => c.Name).ToListAsync(ct);

    public Task<MenuCategory?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => _db.MenuCategories.FirstOrDefaultAsync(c => c.Id == id, ct);

    public async Task AddAsync(MenuCategory category, CancellationToken ct = default)
        => await _db.MenuCategories.AddAsync(category, ct);

    public Task<int> SaveChangesAsync(CancellationToken ct = default)
        => _db.SaveChangesAsync(ct);
}
