using DineFlow.Application.DTOs.Orders;
using DineFlow.Domain.Common;
using DineFlow.Domain.Entities;
using DineFlow.Domain.Enums;
using DineFlow.Domain.Interfaces;
using FluentValidation;

namespace DineFlow.Application.Services;

public class OrderService : IOrderService
{
    private readonly IOrderRepository _orders;
    private readonly IMenuItemRepository _menuItems;
    private readonly IAuditLogRepository _auditLogs;
    private readonly IOrderHubNotifier _hub;
    private readonly IAppUserRepository _users;
    private readonly IFloorRepository _floors;
    private readonly IValidator<CreateOrderRequest> _createVal;
    private readonly IValidator<AddItemsRequest> _addItemsVal;
    private readonly IValidator<UpdateOrderStatusRequest> _updateStatusVal;

    public OrderService(
        IOrderRepository orders,
        IMenuItemRepository menuItems,
        IAuditLogRepository auditLogs,
        IOrderHubNotifier hub,
        IAppUserRepository users,
        IFloorRepository floors,
        IValidator<CreateOrderRequest> createVal,
        IValidator<AddItemsRequest> addItemsVal,
        IValidator<UpdateOrderStatusRequest> updateStatusVal)
    {
        _orders = orders;
        _menuItems = menuItems;
        _auditLogs = auditLogs;
        _hub = hub;
        _users = users;
        _floors = floors;
        _createVal = createVal;
        _addItemsVal = addItemsVal;
        _updateStatusVal = updateStatusVal;
    }

    public async Task<Result<IReadOnlyList<OrderDto>>> GetActiveOrdersAsync(Guid callerId, UserRole callerRole, CancellationToken ct = default)
    {
        var orders = await _orders.GetActiveOrdersAsync(ct);
        if (callerRole == UserRole.Waiter)
            orders = orders.Where(o => o.AssignedWaiterId == callerId).ToList();
        return Result<IReadOnlyList<OrderDto>>.Success(orders.Select(ToDto).ToList());
    }

    public async Task<Result<OrderDto>> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var order = await _orders.GetByIdWithItemsAsync(id, ct);
        if (order is null)
            return Result<OrderDto>.Failure(ResultError.NotFound, $"Order {id} not found.");
        return Result<OrderDto>.Success(ToDto(order));
    }

    public async Task<Result<OrderDto>> CreateOrderAsync(CreateOrderRequest request, Guid performedBy, CancellationToken ct = default)
    {
        var v = await _createVal.ValidateAsync(request, ct);
        if (!v.IsValid)
            return Result<OrderDto>.Failure(ResultError.Validation, string.Join("; ", v.Errors.Select(e => e.ErrorMessage)));

        if (request.RestaurantTableId.HasValue)
        {
            var tableOccupied = await _orders.HasActiveOrderForRestaurantTableAsync(request.RestaurantTableId.Value, ct);
            if (tableOccupied)
                return Result<OrderDto>.Failure(
                    ResultError.Conflict,
                    "This table already has an active order. Complete or close the existing order before placing a new one.");
        }

        var order = new Order
        {
            OrderNumber = GenerateOrderNumber(),
            Channel = request.Channel,
            CustomerName = request.CustomerName,
            MemberCount = request.MemberCount,
            RestaurantTableId = request.RestaurantTableId,
            CreatedBy = performedBy.ToString(),
            UpdatedBy = performedBy.ToString()
        };

        decimal total = 0m;
        foreach (var item in request.Items)
        {
            var menuItem = await _menuItems.GetByIdAsync(item.MenuItemId, ct);
            if (menuItem is null || !menuItem.IsAvailable)
                return Result<OrderDto>.Failure(ResultError.Validation, $"Menu item {item.MenuItemId} not found or unavailable.");

            var orderItem = new OrderItem
            {
                MenuItemId = item.MenuItemId,
                Quantity = item.Quantity,
                UnitPrice = menuItem.Price,
                CustomizationNote = item.CustomizationNote,
                CreatedBy = performedBy.ToString(),
                UpdatedBy = performedBy.ToString()
            };
            order.Items.Add(orderItem);
            total += menuItem.Price * item.Quantity;
        }

        order.TotalAmount = total;

        await _orders.AddAsync(order, ct);

        var auditLog = new AuditLog
        {
            EntityId = order.Id,
            EntityType = "Order",
            Action = "Created",
            PerformedBy = performedBy.ToString(),
            Timestamp = DateTime.UtcNow,
            CreatedBy = performedBy.ToString(),
            UpdatedBy = performedBy.ToString()
        };
        await _auditLogs.AddAsync(auditLog, ct);

        await _orders.SaveChangesAsync(ct);

        if (order.RestaurantTableId.HasValue)
        {
            await _floors.UpdateTableStatusAsync(order.RestaurantTableId.Value, TableStatus.Occupied);
            await _floors.SaveChangesAsync();
            await _hub.SendToGroupAsync("manager", "TableStatusChanged",
                new { tableId = order.RestaurantTableId.Value, status = TableStatus.Occupied.ToString() }, ct);
            await _hub.SendToGroupAsync("kitchen", "TableStatusChanged",
                new { tableId = order.RestaurantTableId.Value, status = TableStatus.Occupied.ToString() }, ct);
        }

        var dto = ToDto(order);
        await _hub.SendToGroupAsync("kitchen", "OrderPlaced", new { order = dto }, ct);
        await _hub.SendToGroupAsync("manager", "OrderPlaced", new { order = dto }, ct);

        return Result<OrderDto>.Success(dto);
    }

    public async Task<Result<OrderDto>> AddItemsAsync(Guid orderId, AddItemsRequest request, Guid performedBy, CancellationToken ct = default)
    {
        var v = await _addItemsVal.ValidateAsync(request, ct);
        if (!v.IsValid)
            return Result<OrderDto>.Failure(ResultError.Validation, string.Join("; ", v.Errors.Select(e => e.ErrorMessage)));

        // Load Order with fresh tracking AFTER all menu-item queries are done.
        var order = await _orders.GetByIdWithItemsAsync(orderId, ct);
        if (order is null)
            return Result<OrderDto>.Failure(ResultError.NotFound, $"Order {orderId} not found.");

        if (order.Status == OrderStatus.Paid || order.Status == OrderStatus.Closed)
            return Result<OrderDto>.Failure(ResultError.Conflict, "Cannot add items to an order that has already been paid.");
        
        decimal addedTotal = 0m;
        var newItems = new List<OrderItem>();
        foreach (var item in request.Items)
        {
            var menuItem = await _menuItems.GetByIdAsync(item.MenuItemId, ct);
            if (menuItem is null || !menuItem.IsAvailable)
                return Result<OrderDto>.Failure(ResultError.Validation, $"Menu item {item.MenuItemId} not found or unavailable.");
            newItems.Add(new OrderItem
            {
                Order = order,
                MenuItemId = item.MenuItemId,
                Quantity = item.Quantity,
                UnitPrice = menuItem.Price,
                CustomizationNote = item.CustomizationNote,
                CreatedBy = performedBy.ToString(),
                UpdatedBy = performedBy.ToString()
            });
            addedTotal += menuItem.Price * item.Quantity;
        }

        foreach (var item in newItems)
        {
            await _orders.AddOrderItemAsync(item, ct);
        }

        order.TotalAmount += addedTotal;
        order.UpdatedBy = performedBy.ToString();

        var auditLog = new AuditLog
        {
            EntityId = order.Id,
            EntityType = "Order",
            Action = "ItemsAdded",
            PerformedBy = performedBy.ToString(),
            Timestamp = DateTime.UtcNow,
            CreatedBy = performedBy.ToString(),
            UpdatedBy = performedBy.ToString()
        };
        await _auditLogs.AddAsync(auditLog, ct);

        await _orders.UpdateAsync(order, ct);

        return Result<OrderDto>.Success(ToDto(order));
    }

    public async Task<Result<OrderDto>> UpdateOrderStatusAsync(Guid orderId, UpdateOrderStatusRequest request, Guid performedBy, CancellationToken ct = default)
    {
        var v = await _updateStatusVal.ValidateAsync(request, ct);
        if (!v.IsValid)
            return Result<OrderDto>.Failure(ResultError.Validation, string.Join("; ", v.Errors.Select(e => e.ErrorMessage)));

        var order = await _orders.GetByIdWithItemsAsync(orderId, ct);
        if (order is null)
            return Result<OrderDto>.Failure(ResultError.NotFound, $"Order {orderId} not found.");

        var previousStatus = order.Status;

        try
        {
            order.TransitionTo(request.Status);
        }
        catch (InvalidOperationException ex)
        {
            return Result<OrderDto>.Failure(ResultError.Conflict, ex.Message);
        }

        if (request.Status == OrderStatus.Paid && request.PaymentMode.HasValue)
            order.PaymentMode = request.PaymentMode.Value;

        if (request.Status == OrderStatus.Paid && request.Note is not null)
            order.Notes = request.Note;

        order.UpdatedBy = performedBy.ToString();

        await _auditLogs.AddAsync(new AuditLog
        {
            EntityId = orderId,
            EntityType = "Order",
            Action = "StatusChanged",
            FromStatus = previousStatus,
            ToStatus = request.Status,
            PaymentMode = request.Status == OrderStatus.Paid ? request.PaymentMode : null,
            PerformedBy = performedBy.ToString(),
            Timestamp = DateTime.UtcNow,
            CreatedBy = performedBy.ToString(),
            UpdatedBy = performedBy.ToString(),
        }, ct);

        await _orders.UpdateAsync(order, ct);

        if (order.RestaurantTableId.HasValue &&
            (request.Status == OrderStatus.Paid || request.Status == OrderStatus.Closed))
        {
            await _floors.UpdateTableStatusAsync(order.RestaurantTableId.Value, TableStatus.Available);
            await _floors.SaveChangesAsync();
            await _hub.SendToGroupAsync("manager", "TableStatusChanged",
                new { tableId = order.RestaurantTableId.Value, status = TableStatus.Available.ToString() }, ct);
            await _hub.SendToGroupAsync("kitchen", "TableStatusChanged",
                new { tableId = order.RestaurantTableId.Value, status = TableStatus.Available.ToString() }, ct);
        }

        var dto = ToDto(order);

        var payload = new
        {
            orderId = orderId.ToString(),
            newStatus = request.Status,
            previousStatus,
            performedBy = performedBy.ToString(),
            timestamp = DateTime.UtcNow.ToString("O"),
        };

        await _hub.SendToGroupAsync("kitchen", "OrderStatusChanged", payload, ct);
        await _hub.SendToGroupAsync("manager", "OrderStatusChanged", payload, ct);

        if (order.AssignedWaiterId.HasValue)
            await _hub.SendToGroupAsync($"user-{order.AssignedWaiterId.Value}", "OrderStatusChanged", payload, ct);

        return Result<OrderDto>.Success(dto);
    }

    public async Task<Result<OrderDto>> AssignWaiterAsync(Guid orderId, Guid waiterId, Guid performedBy, CancellationToken ct = default)
    {
        var waiter = await _users.GetByIdAsync(waiterId, ct);
        if (waiter is null || waiter.Role != UserRole.Waiter)
            return Result<OrderDto>.Failure(ResultError.Validation, "Specified user is not a Waiter.");

        var order = await _orders.GetByIdWithItemsAsync(orderId, ct);
        if (order is null)
            return Result<OrderDto>.Failure(ResultError.NotFound, $"Order {orderId} not found.");

        var previousWaiterId = order.AssignedWaiterId;

        order.AssignWaiter(waiterId, waiter.Name);
        order.UpdatedBy = performedBy.ToString();

        await _auditLogs.AddAsync(new AuditLog
        {
            EntityId = orderId,
            EntityType = "Order",
            Action = "WaiterAssigned",
            PerformedBy = performedBy.ToString(),
            Timestamp = DateTime.UtcNow,
            CreatedBy = performedBy.ToString(),
            UpdatedBy = performedBy.ToString(),
        }, ct);

        await _orders.UpdateAsync(order, ct);

        var dto = ToDto(order);
        await _hub.SendToGroupAsync("manager", "WaiterAssigned", new { order = dto }, ct);
        await _hub.SendToGroupAsync($"user-{waiterId}", "WaiterAssigned", new { order = dto }, ct);

        // Notify the previously assigned waiter so they can remove the order from their view
        if (previousWaiterId.HasValue && previousWaiterId.Value != waiterId)
            await _hub.SendToGroupAsync($"user-{previousWaiterId.Value}", "WaiterAssigned", new { order = dto }, ct);

        return Result<OrderDto>.Success(dto);
    }

    private static string GenerateOrderNumber()
        => $"ORD-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";

    private static OrderDto ToDto(Order o) => new(
        o.Id,
        o.OrderNumber,
        o.Status,
        o.Channel,
        o.RestaurantTableId,
        o.CustomerName,
        o.Notes,
        o.MemberCount,
        o.TotalAmount,
        o.PaymentMode,
        o.CreatedAt,
        o.UpdatedAt,
        o.Items.Select(i => new OrderItemDto(
            i.Id,
            i.MenuItemId,
            i.MenuItem?.Name ?? string.Empty,
            i.UnitPrice,
            i.Quantity,
            i.CustomizationNote)).ToList(),
        o.AssignedWaiterId,
        o.AssignedWaiterName);
}
