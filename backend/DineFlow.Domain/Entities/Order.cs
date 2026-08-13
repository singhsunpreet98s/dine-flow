using DineFlow.Domain.Common;
using DineFlow.Domain.Enums;

namespace DineFlow.Domain.Entities;

public class Order : BaseEntity
{
    private static readonly Dictionary<OrderStatus, OrderStatus[]> _validTransitions = new()
    {
        [OrderStatus.Placed]        = [OrderStatus.SentToKitchen, OrderStatus.Billed],
        [OrderStatus.SentToKitchen] = [OrderStatus.Preparing],
        [OrderStatus.Preparing]     = [OrderStatus.OutOfStock, OrderStatus.Prepared],
        [OrderStatus.OutOfStock]    = [OrderStatus.Preparing, OrderStatus.Prepared],
        [OrderStatus.Prepared]      = [OrderStatus.Served, OrderStatus.Billed],
        [OrderStatus.Served]        = [OrderStatus.Billed],
        [OrderStatus.Billed]        = [OrderStatus.Paid],
        [OrderStatus.Paid]          = [OrderStatus.Closed],
        [OrderStatus.Closed]        = []
    };

    public string OrderNumber { get; set; } = string.Empty;
    public OrderStatus Status { get; private set; } = OrderStatus.Placed;
    public OrderChannel Channel { get; set; }
    public Guid? RestaurantTableId { get; set; }
    public RestaurantTable? RestaurantTable { get; set; }
    public string? CustomerName { get; set; }
    public string? Notes { get; set; }
    public int MemberCount { get; set; }
    public decimal TotalAmount { get; set; }
    public PaymentMode? PaymentMode { get; set; }
    public Guid? AssignedWaiterId { get; private set; }
    public string? AssignedWaiterName { get; private set; }
    public ICollection<OrderItem> Items { get; private set; } = new List<OrderItem>();

    public void AssignWaiter(Guid waiterId, string waiterName)
    {
        AssignedWaiterId = waiterId;
        AssignedWaiterName = waiterName;
    }

    public void TransitionTo(OrderStatus newStatus)
    {
        if (!_validTransitions.TryGetValue(Status, out var allowed) || !allowed.Contains(newStatus))
            throw new InvalidOperationException($"Cannot transition from {Status} to {newStatus}.");
        Status = newStatus;
    }
}
