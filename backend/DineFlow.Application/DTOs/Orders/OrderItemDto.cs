namespace DineFlow.Application.DTOs.Orders;

public record OrderItemDto(
    Guid Id,
    Guid MenuItemId,
    string MenuItemName,
    decimal UnitPrice,
    int Quantity,
    string? CustomizationNote);
