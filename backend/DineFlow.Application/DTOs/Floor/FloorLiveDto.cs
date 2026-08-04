namespace DineFlow.Application.DTOs.Floor;

public record OrderItemLiveDto(
    string MenuItemName,
    int Quantity,
    string? CustomizationNote
);

public record ActiveOrderSummaryDto(
    Guid OrderId,
    string OrderNumber,
    string Status,
    int MemberCount,
    decimal TotalAmount,
    DateTime PlacedAt,
    IReadOnlyList<OrderItemLiveDto> Items,
    string? AssignedWaiterName,
    string? CustomerName
);

public record TableLiveDto(
    Guid Id,
    string TableNumber,
    int Capacity,
    string Shape,
    double PositionX,
    double PositionY,
    double Width,
    double Height,
    string Status,
    ActiveOrderSummaryDto? ActiveOrder
);

public record FloorLiveDto(
    Guid Id,
    string Name,
    int DisplayOrder,
    IReadOnlyList<TableLiveDto> Tables
);
