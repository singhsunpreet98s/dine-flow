using DineFlow.Application.DTOs.Orders;
using DineFlow.Application.Services;
using DineFlow.Domain.Common;
using DineFlow.Domain.Entities;
using DineFlow.Domain.Enums;
using DineFlow.Domain.Interfaces;
using FluentAssertions;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.Extensions.Logging;
using Moq;

namespace DineFlow.Tests.Services;

/// <summary>
/// Unit tests for <see cref="OrderService"/>.
/// All repository and infrastructure dependencies are mocked with Moq.
/// </summary>
public class OrderServiceTests
{
    // ── mocks ─────────────────────────────────────────────────────────────────

    private readonly Mock<IOrderRepository> _orders = new();
    private readonly Mock<IMenuItemRepository> _menuItems = new();
    private readonly Mock<IAuditLogRepository> _auditLogs = new();
    private readonly Mock<IOrderHubNotifier> _hub = new();
    private readonly Mock<IAppUserRepository> _users = new();
    private readonly Mock<IFloorRepository> _floors = new();
    private readonly Mock<IValidator<CreateOrderRequest>> _createVal = new();
    private readonly Mock<IValidator<AddItemsRequest>> _addItemsVal = new();
    private readonly Mock<IValidator<UpdateOrderStatusRequest>> _updateStatusVal = new();
    private readonly OrderService _sut;

    public OrderServiceTests()
    {
        // Infrastructure stubs that are safe to return for all tests by default.
        _auditLogs
            .Setup(r => r.AddAsync(It.IsAny<AuditLog>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        _hub
            .Setup(h => h.SendToGroupAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        _floors
            .Setup(f => f.UpdateTableStatusAsync(It.IsAny<Guid>(), It.IsAny<TableStatus>()))
            .Returns(Task.CompletedTask);

        _floors
            .Setup(f => f.SaveChangesAsync())
            .Returns(Task.CompletedTask);

        _sut = new OrderService(
            _orders.Object,
            _menuItems.Object,
            _auditLogs.Object,
            _hub.Object,
            _users.Object,
            _floors.Object,
            _createVal.Object,
            _addItemsVal.Object,
            _updateStatusVal.Object);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Creates a minimal <see cref="Order"/> in <see cref="OrderStatus.Placed"/> state.
    /// </summary>
    private static Order CreateOrder(Guid? id = null)
    {
        var order = new Order
        {
            OrderNumber = "ORD-TEST-001",
            Channel = OrderChannel.DineIn,
            MemberCount = 2,
            TotalAmount = 100m,
            CreatedBy = "test",
            UpdatedBy = "test"
        };

        if (id.HasValue)
        {
            // Use reflection to set the Id so callers can control the identity.
            typeof(Order)
                .GetProperty(nameof(Order.Id))!
                .SetValue(order, id.Value);
        }

        return order;
    }

    /// <summary>
    /// Walks an <see cref="Order"/> from <see cref="OrderStatus.Placed"/> to
    /// <see cref="OrderStatus.Closed"/> through every intermediate state.
    /// </summary>
    private static void TransitionToClosedState(Order order)
    {
        order.TransitionTo(OrderStatus.SentToKitchen);
        order.TransitionTo(OrderStatus.Preparing);
        order.TransitionTo(OrderStatus.Prepared);
        order.TransitionTo(OrderStatus.Served);
        order.TransitionTo(OrderStatus.Billed);
        order.TransitionTo(OrderStatus.Paid);
        order.TransitionTo(OrderStatus.Closed);
    }

    /// <summary>
    /// Returns a <see cref="ValidationResult"/> representing a valid input.
    /// </summary>
    private static ValidationResult ValidResult() => new();

    /// <summary>
    /// Returns a <see cref="ValidationResult"/> containing a single error.
    /// </summary>
    private static ValidationResult InvalidResult()
        => new(new List<ValidationFailure> { new("Field", "Validation error.") });

    // ── GetActiveOrdersAsync ──────────────────────────────────────────────────

    [Fact]
    public async Task GetActiveOrdersAsync_WithAdminRole_ReturnsAllActiveOrders()
    {
        var adminId = Guid.NewGuid();
        var waiterAId = Guid.NewGuid();
        var waiterBId = Guid.NewGuid();

        var order1 = CreateOrder();
        var order2 = CreateOrder();
        var order3 = CreateOrder();

        // Assign order1 and order2 to waiterA; order3 to waiterB.
        order1.AssignWaiter(waiterAId, "Waiter A");
        order2.AssignWaiter(waiterAId, "Waiter A");
        order3.AssignWaiter(waiterBId, "Waiter B");

        var activeOrders = new List<Order> { order1, order2, order3 };
        _orders
            .Setup(r => r.GetActiveOrdersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(activeOrders);

        var result = await _sut.GetActiveOrdersAsync(adminId, UserRole.Admin);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().HaveCount(3);
    }

    [Fact]
    public async Task GetActiveOrdersAsync_WithWaiterRole_ReturnsOnlyAssignedOrders()
    {
        var myWaiterId = Guid.NewGuid();
        var otherWaiterId = Guid.NewGuid();

        var myOrder1 = CreateOrder();
        var myOrder2 = CreateOrder();
        var otherOrder = CreateOrder();

        myOrder1.AssignWaiter(myWaiterId, "My Waiter");
        myOrder2.AssignWaiter(myWaiterId, "My Waiter");
        otherOrder.AssignWaiter(otherWaiterId, "Other Waiter");

        _orders
            .Setup(r => r.GetActiveOrdersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Order> { myOrder1, myOrder2, otherOrder });

        var result = await _sut.GetActiveOrdersAsync(myWaiterId, UserRole.Waiter);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().HaveCount(2);
        result.Value.Should().AllSatisfy(o => o.AssignedWaiterId.Should().Be(myWaiterId));
    }

    [Fact]
    public async Task GetActiveOrdersAsync_WithNoOrders_ReturnsEmptyList()
    {
        _orders
            .Setup(r => r.GetActiveOrdersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Order>());

        var result = await _sut.GetActiveOrdersAsync(Guid.NewGuid(), UserRole.Admin);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().BeEmpty();
    }

    // ── GetByIdAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetByIdAsync_WhenOrderExists_ReturnsSuccess()
    {
        var orderId = Guid.NewGuid();
        var order = CreateOrder(orderId);

        _orders
            .Setup(r => r.GetByIdWithItemsAsync(orderId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(order);

        var result = await _sut.GetByIdAsync(orderId);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();
        result.Value!.Id.Should().Be(orderId);
    }

    [Fact]
    public async Task GetByIdAsync_WhenOrderNotFound_ReturnsNotFound()
    {
        var orderId = Guid.NewGuid();

        _orders
            .Setup(r => r.GetByIdWithItemsAsync(orderId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Order?)null);

        var result = await _sut.GetByIdAsync(orderId);

        result.IsSuccess.Should().BeFalse();
        result.ErrorType.Should().Be(ResultError.NotFound);
    }

    // ── CreateOrderAsync ──────────────────────────────────────────────────────

    [Fact]
    public async Task CreateOrderAsync_WhenValidationFails_ReturnsValidationFailure()
    {
        _createVal
            .Setup(v => v.ValidateAsync(It.IsAny<CreateOrderRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(InvalidResult());

        var request = new CreateOrderRequest("Alice", OrderChannel.DineIn, 2,
            new List<CreateOrderItemRequest>());

        var result = await _sut.CreateOrderAsync(request, Guid.NewGuid());

        result.IsSuccess.Should().BeFalse();
        result.ErrorType.Should().Be(ResultError.Validation);
    }

    [Fact]
    public async Task CreateOrderAsync_WhenTableAlreadyOccupied_ReturnsConflict()
    {
        var tableId = Guid.NewGuid();

        _createVal
            .Setup(v => v.ValidateAsync(It.IsAny<CreateOrderRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ValidResult());

        _orders
            .Setup(r => r.HasActiveOrderForRestaurantTableAsync(tableId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var request = new CreateOrderRequest("Bob", OrderChannel.DineIn, 2,
            new List<CreateOrderItemRequest>(), tableId);

        var result = await _sut.CreateOrderAsync(request, Guid.NewGuid());

        result.IsSuccess.Should().BeFalse();
        result.ErrorType.Should().Be(ResultError.Conflict);
    }

    [Fact]
    public async Task CreateOrderAsync_HappyPath_CreatesOrderAndBroadcasts()
    {
        var menuItemId = Guid.NewGuid();
        var performedBy = Guid.NewGuid();

        _createVal
            .Setup(v => v.ValidateAsync(It.IsAny<CreateOrderRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ValidResult());

        _orders
            .Setup(r => r.HasActiveOrderForRestaurantTableAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        _menuItems
            .Setup(r => r.GetByIdAsync(menuItemId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new MenuItem
            {
                Name = "Paneer Tikka",
                Price = 250m,
                IsAvailable = true,
                CreatedBy = "seed",
                UpdatedBy = "seed"
            });

        _orders
            .Setup(r => r.AddAsync(It.IsAny<Order>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        _orders
            .Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);

        var request = new CreateOrderRequest(
            "Charlie",
            OrderChannel.DineIn,
            2,
            new List<CreateOrderItemRequest>
            {
                new(menuItemId, 2, null)
            });

        var result = await _sut.CreateOrderAsync(request, performedBy);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();
        result.Value!.TotalAmount.Should().Be(500m); // 250 * 2

        // Order must be persisted
        _orders.Verify(
            r => r.AddAsync(It.IsAny<Order>(), It.IsAny<CancellationToken>()),
            Times.Once);

        // Broadcast must reach both kitchen and manager groups
        _hub.Verify(
            h => h.SendToGroupAsync(
                "kitchen",
                "OrderPlaced",
                It.IsAny<object>(),
                It.IsAny<CancellationToken>()),
            Times.Once);

        _hub.Verify(
            h => h.SendToGroupAsync(
                "manager",
                "OrderPlaced",
                It.IsAny<object>(),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    // ── UpdateOrderStatusAsync ────────────────────────────────────────────────

    [Fact]
    public async Task UpdateOrderStatusAsync_WhenValidationFails_ReturnsValidationFailure()
    {
        _updateStatusVal
            .Setup(v => v.ValidateAsync(It.IsAny<UpdateOrderStatusRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(InvalidResult());

        var request = new UpdateOrderStatusRequest(OrderStatus.SentToKitchen);

        var result = await _sut.UpdateOrderStatusAsync(Guid.NewGuid(), request, Guid.NewGuid());

        result.IsSuccess.Should().BeFalse();
        result.ErrorType.Should().Be(ResultError.Validation);
    }

    [Fact]
    public async Task UpdateOrderStatusAsync_WhenOrderNotFound_ReturnsNotFound()
    {
        var orderId = Guid.NewGuid();

        _updateStatusVal
            .Setup(v => v.ValidateAsync(It.IsAny<UpdateOrderStatusRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ValidResult());

        _orders
            .Setup(r => r.GetByIdWithItemsAsync(orderId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Order?)null);

        var request = new UpdateOrderStatusRequest(OrderStatus.SentToKitchen);

        var result = await _sut.UpdateOrderStatusAsync(orderId, request, Guid.NewGuid());

        result.IsSuccess.Should().BeFalse();
        result.ErrorType.Should().Be(ResultError.NotFound);
    }

    [Fact]
    public async Task UpdateOrderStatusAsync_WhenTransitionInvalid_ReturnsFailure()
    {
        // A Closed order cannot transition anywhere — any target status is invalid.
        var orderId = Guid.NewGuid();
        var order = CreateOrder(orderId);
        TransitionToClosedState(order);

        _updateStatusVal
            .Setup(v => v.ValidateAsync(It.IsAny<UpdateOrderStatusRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ValidResult());

        _orders
            .Setup(r => r.GetByIdWithItemsAsync(orderId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(order);

        // Attempt an invalid transition: Closed → SentToKitchen
        var request = new UpdateOrderStatusRequest(OrderStatus.SentToKitchen);

        var result = await _sut.UpdateOrderStatusAsync(orderId, request, Guid.NewGuid());

        result.IsSuccess.Should().BeFalse();
        result.ErrorType.Should().Be(ResultError.Conflict);
    }

    [Fact]
    public async Task UpdateOrderStatusAsync_HappyPath_UpdatesStatusAndBroadcasts()
    {
        var orderId = Guid.NewGuid();
        var order = CreateOrder(orderId); // starts at Placed

        _updateStatusVal
            .Setup(v => v.ValidateAsync(It.IsAny<UpdateOrderStatusRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ValidResult());

        _orders
            .Setup(r => r.GetByIdWithItemsAsync(orderId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(order);

        _orders
            .Setup(r => r.UpdateAsync(It.IsAny<Order>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Valid transition: Placed → SentToKitchen
        var request = new UpdateOrderStatusRequest(OrderStatus.SentToKitchen);

        var result = await _sut.UpdateOrderStatusAsync(orderId, request, Guid.NewGuid());

        result.IsSuccess.Should().BeTrue();
        result.Value!.Status.Should().Be(OrderStatus.SentToKitchen);

        // Hub must broadcast to both kitchen and manager
        _hub.Verify(
            h => h.SendToGroupAsync(
                "kitchen",
                "OrderStatusChanged",
                It.IsAny<object>(),
                It.IsAny<CancellationToken>()),
            Times.Once);

        _hub.Verify(
            h => h.SendToGroupAsync(
                "manager",
                "OrderStatusChanged",
                It.IsAny<object>(),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task UpdateOrderStatusAsync_WhenPaid_SetsPaymentMode()
    {
        var orderId = Guid.NewGuid();
        var order = CreateOrder(orderId);

        // Advance to Billed so that Paid is a valid next state.
        order.TransitionTo(OrderStatus.Billed);

        _updateStatusVal
            .Setup(v => v.ValidateAsync(It.IsAny<UpdateOrderStatusRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ValidResult());

        _orders
            .Setup(r => r.GetByIdWithItemsAsync(orderId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(order);

        _orders
            .Setup(r => r.UpdateAsync(It.IsAny<Order>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Billed → Paid with Cash payment mode
        var request = new UpdateOrderStatusRequest(OrderStatus.Paid, PaymentMode.Cash);

        var result = await _sut.UpdateOrderStatusAsync(orderId, request, Guid.NewGuid());

        result.IsSuccess.Should().BeTrue();
        result.Value!.Status.Should().Be(OrderStatus.Paid);
        result.Value!.PaymentMode.Should().Be(PaymentMode.Cash);

        // The underlying Order entity should have PaymentMode set
        order.PaymentMode.Should().Be(PaymentMode.Cash);
    }

    // ── AddItemsAsync ─────────────────────────────────────────────────────────

    /// <summary>
    /// Configures the mocks needed for every AddItemsAsync test — returns a
    /// ready-to-use <see cref="AddItemsRequest"/> containing the given menu item.
    /// </summary>
    private AddItemsRequest SetupAddItemsMocks(Guid menuItemId, Guid orderId, Order order, bool setupSave = true)
    {
        _addItemsVal
            .Setup(v => v.ValidateAsync(It.IsAny<AddItemsRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ValidResult());

        _menuItems
            .Setup(r => r.GetByIdAsync(menuItemId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new MenuItem
            {
                Name = "Chai",
                Price = 30m,
                IsAvailable = true,
                CreatedBy = "seed",
                UpdatedBy = "seed"
            });

        _orders
            .Setup(r => r.GetByIdWithItemsAsync(orderId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(order);

        if (setupSave)
        {
            _orders
                .Setup(r => r.UpdateAsync(It.IsAny<Order>(), It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);
        }

        return new AddItemsRequest(new[] { new CreateOrderItemRequest(menuItemId, 1, null) });
    }

    [Fact]
    public async Task AddItemsAsync_WhenStatusIsPlaced_ReturnsSuccess()
    {
        var menuItemId = Guid.NewGuid();
        var orderId    = Guid.NewGuid();
        var order      = CreateOrder(orderId); // starts at Placed
        var request    = SetupAddItemsMocks(menuItemId, orderId, order);

        var result = await _sut.AddItemsAsync(orderId, request, Guid.NewGuid());

        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task AddItemsAsync_WhenStatusIsPreparing_ReturnsSuccess()
    {
        var menuItemId = Guid.NewGuid();
        var orderId    = Guid.NewGuid();
        var order      = CreateOrder(orderId);
        order.TransitionTo(OrderStatus.SentToKitchen);
        order.TransitionTo(OrderStatus.Preparing);
        var request = SetupAddItemsMocks(menuItemId, orderId, order);

        var result = await _sut.AddItemsAsync(orderId, request, Guid.NewGuid());

        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task AddItemsAsync_WhenStatusIsServed_ReturnsSuccess()
    {
        var menuItemId = Guid.NewGuid();
        var orderId    = Guid.NewGuid();
        var order      = CreateOrder(orderId);
        order.TransitionTo(OrderStatus.SentToKitchen);
        order.TransitionTo(OrderStatus.Preparing);
        order.TransitionTo(OrderStatus.Prepared);
        order.TransitionTo(OrderStatus.Served);
        var request = SetupAddItemsMocks(menuItemId, orderId, order);

        var result = await _sut.AddItemsAsync(orderId, request, Guid.NewGuid());

        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task AddItemsAsync_WhenStatusIsBilled_ReturnsSuccess()
    {
        var menuItemId = Guid.NewGuid();
        var orderId    = Guid.NewGuid();
        var order      = CreateOrder(orderId);
        order.TransitionTo(OrderStatus.Billed); // Placed → Billed is a valid shortcut
        var request = SetupAddItemsMocks(menuItemId, orderId, order);

        var result = await _sut.AddItemsAsync(orderId, request, Guid.NewGuid());

        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task AddItemsAsync_WhenStatusIsPaid_ReturnsConflict()
    {
        var menuItemId = Guid.NewGuid();
        var orderId    = Guid.NewGuid();
        var order      = CreateOrder(orderId);
        order.TransitionTo(OrderStatus.Billed);
        order.TransitionTo(OrderStatus.Paid);
        // SaveChanges should NOT be called for a locked order — omit setupSave
        var request = SetupAddItemsMocks(menuItemId, orderId, order, setupSave: false);

        var result = await _sut.AddItemsAsync(orderId, request, Guid.NewGuid());

        result.IsSuccess.Should().BeFalse();
        result.ErrorType.Should().Be(ResultError.Conflict);
        result.Message.Should().ContainEquivalentOf("paid");
    }

    [Fact]
    public async Task AddItemsAsync_WhenStatusIsClosed_ReturnsConflict()
    {
        var menuItemId = Guid.NewGuid();
        var orderId    = Guid.NewGuid();
        var order      = CreateOrder(orderId);
        TransitionToClosedState(order);
        var request = SetupAddItemsMocks(menuItemId, orderId, order, setupSave: false);

        var result = await _sut.AddItemsAsync(orderId, request, Guid.NewGuid());

        result.IsSuccess.Should().BeFalse();
        result.ErrorType.Should().Be(ResultError.Conflict);
        result.Message.Should().ContainEquivalentOf("paid");
    }

    [Fact]
    public async Task AddItemsAsync_WhenOrderNotFound_ReturnsNotFound()
    {
        var menuItemId = Guid.NewGuid();
        var orderId    = Guid.NewGuid();

        _addItemsVal
            .Setup(v => v.ValidateAsync(It.IsAny<AddItemsRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ValidResult());

        _menuItems
            .Setup(r => r.GetByIdAsync(menuItemId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new MenuItem
            {
                Name = "Chai", Price = 30m, IsAvailable = true,
                CreatedBy = "seed", UpdatedBy = "seed"
            });

        _orders
            .Setup(r => r.GetByIdWithItemsAsync(orderId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Order?)null);

        var request = new AddItemsRequest(new[] { new CreateOrderItemRequest(menuItemId, 1, null) });

        var result = await _sut.AddItemsAsync(orderId, request, Guid.NewGuid());

        result.IsSuccess.Should().BeFalse();
        result.ErrorType.Should().Be(ResultError.NotFound);
    }

    // ── AssignWaiterAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task AssignWaiterAsync_WhenOrderNotFound_ReturnsNotFound()
    {
        var orderId = Guid.NewGuid();
        var waiterId = Guid.NewGuid();

        // Waiter is resolved before the order — provide a valid waiter so the service
        // reaches the order lookup (which returns null → NotFound).
        _users
            .Setup(r => r.GetByIdAsync(waiterId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AppUser
            {
                Name = "Valid Waiter",
                Email = "waiter@dineflow.com",
                Role = UserRole.Waiter,
                PasswordHash = "hashed",
                CreatedBy = "test",
                UpdatedBy = "test"
            });

        _orders
            .Setup(r => r.GetByIdWithItemsAsync(orderId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Order?)null);

        var result = await _sut.AssignWaiterAsync(orderId, waiterId, Guid.NewGuid());

        result.IsSuccess.Should().BeFalse();
        result.ErrorType.Should().Be(ResultError.NotFound);
    }

    [Fact]
    public async Task AssignWaiterAsync_WhenUserNotFound_ReturnsFailure()
    {
        var orderId = Guid.NewGuid();
        var waiterId = Guid.NewGuid();
        var order = CreateOrder(orderId);

        _orders
            .Setup(r => r.GetByIdWithItemsAsync(orderId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(order);

        _users
            .Setup(r => r.GetByIdAsync(waiterId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((AppUser?)null);

        var result = await _sut.AssignWaiterAsync(orderId, waiterId, Guid.NewGuid());

        result.IsSuccess.Should().BeFalse();
        // The service combines null-user and wrong-role into one Validation failure
        result.ErrorType.Should().Be(ResultError.Validation);
    }

    [Fact]
    public async Task AssignWaiterAsync_WhenUserIsNotWaiter_ReturnsFailure()
    {
        var orderId = Guid.NewGuid();
        var managerId = Guid.NewGuid();
        var order = CreateOrder(orderId);

        _orders
            .Setup(r => r.GetByIdWithItemsAsync(orderId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(order);

        var manager = new AppUser
        {
            Name = "Manager Sam",
            Email = "sam@dineflow.com",
            Role = UserRole.Manager, // not a Waiter
            PasswordHash = "hashed",
            CreatedBy = "test",
            UpdatedBy = "test"
        };

        _users
            .Setup(r => r.GetByIdAsync(managerId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(manager);

        var result = await _sut.AssignWaiterAsync(orderId, managerId, Guid.NewGuid());

        result.IsSuccess.Should().BeFalse();
        result.ErrorType.Should().Be(ResultError.Validation);
        result.Message.Should().Contain("Waiter");
    }

    [Fact]
    public async Task AssignWaiterAsync_HappyPath_AssignsWaiterAndBroadcasts()
    {
        var orderId = Guid.NewGuid();
        var waiterId = Guid.NewGuid();
        var performedBy = Guid.NewGuid();
        var order = CreateOrder(orderId);

        _orders
            .Setup(r => r.GetByIdWithItemsAsync(orderId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(order);

        var waiter = new AppUser
        {
            Name = "Ravi Kumar",
            Email = "ravi@dineflow.com",
            Role = UserRole.Waiter,
            PasswordHash = "hashed",
            CreatedBy = "test",
            UpdatedBy = "test"
        };

        _users
            .Setup(r => r.GetByIdAsync(waiterId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(waiter);

        _orders
            .Setup(r => r.UpdateAsync(It.IsAny<Order>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var result = await _sut.AssignWaiterAsync(orderId, waiterId, performedBy);

        result.IsSuccess.Should().BeTrue();
        result.Value!.AssignedWaiterId.Should().Be(waiterId);
        result.Value!.AssignedWaiterName.Should().Be("Ravi Kumar");

        // Order entity must have the waiter stamped on it
        order.AssignedWaiterId.Should().Be(waiterId);
        order.AssignedWaiterName.Should().Be("Ravi Kumar");

        // Audit log must be written
        _auditLogs.Verify(
            r => r.AddAsync(
                It.Is<AuditLog>(l => l.Action == "WaiterAssigned" && l.EntityId == orderId),
                It.IsAny<CancellationToken>()),
            Times.Once);

        // Broadcast to manager group
        _hub.Verify(
            h => h.SendToGroupAsync(
                "manager",
                "WaiterAssigned",
                It.IsAny<object>(),
                It.IsAny<CancellationToken>()),
            Times.Once);

        // Broadcast to the newly assigned waiter's personal group
        _hub.Verify(
            h => h.SendToGroupAsync(
                $"user-{waiterId}",
                "WaiterAssigned",
                It.IsAny<object>(),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

}
