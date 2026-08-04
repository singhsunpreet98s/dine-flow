using DineFlow.Application.DTOs.Orders;
using DineFlow.Domain.Common;
using DineFlow.Domain.Enums;

namespace DineFlow.Application.Services;

public interface IOrderService
{
    Task<Result<IReadOnlyList<OrderDto>>> GetActiveOrdersAsync(Guid callerId, UserRole callerRole, CancellationToken ct = default);
    Task<Result<OrderDto>> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Result<OrderDto>> CreateOrderAsync(CreateOrderRequest request, Guid performedBy, CancellationToken ct = default);
    Task<Result<OrderDto>> AddItemsAsync(Guid orderId, AddItemsRequest request, Guid performedBy, CancellationToken ct = default);
    Task<Result<OrderDto>> UpdateOrderStatusAsync(Guid orderId, UpdateOrderStatusRequest request, Guid performedBy, CancellationToken ct = default);
    Task<Result<OrderDto>> AssignWaiterAsync(Guid orderId, Guid waiterId, Guid performedBy, CancellationToken ct = default);
}
