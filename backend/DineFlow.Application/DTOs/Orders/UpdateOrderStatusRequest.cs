using DineFlow.Domain.Enums;

namespace DineFlow.Application.DTOs.Orders;

public record UpdateOrderStatusRequest(OrderStatus Status, PaymentMode? PaymentMode = null, string? Note = null);
