using DineFlow.Domain.Entities;
using DineFlow.Domain.Enums;
using DineFlow.Domain.Interfaces;
using DineFlow.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DineFlow.Infrastructure.Repositories;

public class FloorRepository : IFloorRepository
{
    private readonly DineFlowDbContext _db;
    public FloorRepository(DineFlowDbContext db) => _db = db;

    public async Task<List<Floor>> GetAllAsync()
        => await _db.Floors
                    .Include(f => f.Tables)
                    .OrderBy(f => f.DisplayOrder)
                    .ToListAsync();

    public Task<Floor?> GetByIdAsync(Guid id)
        => _db.Floors.FirstOrDefaultAsync(f => f.Id == id);

    public Task<Floor?> GetByIdWithTablesAsync(Guid id)
        => _db.Floors.Include(f => f.Tables).FirstOrDefaultAsync(f => f.Id == id);

    public async Task AddAsync(Floor floor)
        => await _db.Floors.AddAsync(floor);

    public Task<RestaurantTable?> GetTableByIdAsync(Guid id)
        => _db.RestaurantTables.FirstOrDefaultAsync(t => t.Id == id);

    public async Task AddTableAsync(RestaurantTable table)
        => await _db.RestaurantTables.AddAsync(table);

    // Stub: Orders currently reference the legacy Table entity (no FloorId).
    // When Orders are linked to RestaurantTable, update this query to check active order status.
    public Task<bool> HasActiveOrdersOnFloorAsync(Guid floorId)
        => Task.FromResult(false);

    public async Task UpdateTableStatusAsync(Guid tableId, TableStatus status)
    {
        var table = await _db.RestaurantTables.FindAsync(tableId);
        if (table is not null)
            table.Status = status;
    }

    public Task SaveChangesAsync()
        => _db.SaveChangesAsync();
}
