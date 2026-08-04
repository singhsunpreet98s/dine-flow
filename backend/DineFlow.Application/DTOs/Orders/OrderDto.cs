using DineFlow.Domain.Enums;

namespace DineFlow.Application.DTOs.Orders;

public record OrderDto(
    Guid Id,
    string OrderNumber,
    OrderStatus Status,
    OrderChannel Channel,
    Guid? RestaurantTableId,
    string? CustomerName,
    string? Notes,
    int MemberCount,
    decimal TotalAmount,
    PaymentMode? PaymentMode,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyList<OrderItemDto> Items,
    Guid? AssignedWaiterId,
    string? AssignedWaiterName);
