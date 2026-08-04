namespace DineFlow.Application.DTOs.Orders;

public record AddItemsRequest(IReadOnlyList<CreateOrderItemRequest> Items);
