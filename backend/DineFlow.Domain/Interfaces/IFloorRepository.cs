using DineFlow.Domain.Entities;
using DineFlow.Domain.Enums;

namespace DineFlow.Domain.Interfaces;

public interface IFloorRepository
{
    Task<List<Floor>> GetAllAsync();
    Task<Floor?> GetByIdAsync(Guid id);
    Task<Floor?> GetByIdWithTablesAsync(Guid id);
    Task AddAsync(Floor floor);
    Task<RestaurantTable?> GetTableByIdAsync(Guid id);
    Task AddTableAsync(RestaurantTable table);
    Task<bool> HasActiveOrdersOnFloorAsync(Guid floorId);
    Task UpdateTableStatusAsync(Guid tableId, TableStatus status);
    Task SaveChangesAsync();
}
