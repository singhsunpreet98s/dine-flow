using DineFlow.Domain.Entities;
using DineFlow.Domain.Enums;
using DineFlow.Domain.Interfaces;
using DineFlow.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DineFlow.Infrastructure.Repositories;

public class OrderRepository : IOrderRepository
{
    private readonly DineFlowDbContext _db;
    public OrderRepository(DineFlowDbContext db) => _db = db;

    public Task<Order?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => _db.Orders.FirstOrDefaultAsync(o => o.Id == id, ct);

    public Task<Order?> GetByIdWithItemsAsync(Guid id, CancellationToken ct = default)
        => _db.Orders
              .Include(o => o.Items).ThenInclude(i => i.MenuItem)
              .FirstOrDefaultAsync(o => o.Id == id, ct);

    public async Task<IReadOnlyList<Order>> GetActiveOrdersAsync(CancellationToken ct = default)
        => await _db.Orders
            .Include(o => o.Items).ThenInclude(i => i.MenuItem)
            .Where(o => o.Status != OrderStatus.Closed)
            .OrderBy(o => o.CreatedAt)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<Order>> GetByStatusAsync(OrderStatus status, CancellationToken ct = default)
        => await _db.Orders
            .Include(o => o.Items).ThenInclude(i => i.MenuItem)
            .Where(o => o.Status == status)
            .ToListAsync(ct);

    public Task<bool> HasActiveOrderForRestaurantTableAsync(Guid restaurantTableId, CancellationToken ct = default)
        => _db.Orders.AnyAsync(
            o => o.RestaurantTableId == restaurantTableId &&
                 o.Status != OrderStatus.Paid &&
                 o.Status != OrderStatus.Closed,
            ct);

    public async Task<IReadOnlyList<Order>> GetActiveOrdersForRestaurantTablesAsync(CancellationToken ct = default)
        => await _db.Orders
            .Include(o => o.Items).ThenInclude(i => i.MenuItem)
            .Where(o => o.RestaurantTableId != null
                     && o.Status != OrderStatus.Paid
                     && o.Status != OrderStatus.Closed)
            .ToListAsync(ct);

    public async Task AddAsync(Order order, CancellationToken ct = default)
        => await _db.Orders.AddAsync(order, ct);

    public Task<int> SaveChangesAsync(CancellationToken ct = default)
        => _db.SaveChangesAsync(ct);
}
