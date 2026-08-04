using DineFlow.Domain.Enums;

namespace DineFlow.Application.DTOs.Orders;

public record CreateOrderItemRequest(
    Guid MenuItemId,
    int Quantity,
    string? CustomizationNote);

public record CreateOrderRequest(
    string? CustomerName,
    OrderChannel Channel,
    int MemberCount,
    Guid? TableId,
    IReadOnlyList<CreateOrderItemRequest> Items,
    Guid? RestaurantTableId = null);
