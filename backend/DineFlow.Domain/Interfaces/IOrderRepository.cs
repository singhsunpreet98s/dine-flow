using DineFlow.Domain.Entities;
using DineFlow.Domain.Enums;

namespace DineFlow.Domain.Interfaces;

public interface IOrderRepository
{
    Task<Order?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Order?> GetByIdWithItemsAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<Order>> GetActiveOrdersAsync(CancellationToken ct = default);
    Task<IReadOnlyList<Order>> GetByStatusAsync(OrderStatus status, CancellationToken ct = default);
    Task<bool> HasActiveOrderForRestaurantTableAsync(Guid restaurantTableId, CancellationToken ct = default);
    Task<IReadOnlyList<Order>> GetActiveOrdersForRestaurantTablesAsync(CancellationToken ct = default);
    Task AddAsync(Order order, CancellationToken ct = default);
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
