using System.Net;
using System.Net.Http.Json;
using DineFlow.Application.DTOs.Floor;
using DineFlow.Application.DTOs.Orders;
using DineFlow.Application.Services;
using DineFlow.Domain.Common;
using DineFlow.Domain.Enums;
using DineFlow.Tests.Controllers.Helpers;
using FluentAssertions;
using Moq;

namespace DineFlow.Tests.Controllers;

public class OrdersControllerTests : IClassFixture<DineFlowWebApplicationFactory>
{
    private readonly DineFlowWebApplicationFactory _factory;
    private readonly Mock<IOrderService> _orderMock;
    private readonly Mock<IFloorService> _floorMock;

    public OrdersControllerTests(DineFlowWebApplicationFactory factory)
    {
        _factory    = factory;
        _orderMock  = factory.OrderServiceMock;
        _floorMock  = factory.FloorServiceMock;
        _orderMock.Reset();
        _floorMock.Reset();
    }

    private static OrderDto MakeOrderDto(Guid? id = null, Guid? tableId = null) =>
        new(
            id ?? Guid.NewGuid(),
            "ORD-001",
            OrderStatus.Placed,
            OrderChannel.DineIn,
            tableId,
            "Alice",
            null,
            2,
            150m,
            null,
            DateTime.UtcNow,
            DateTime.UtcNow,
            Array.Empty<OrderItemDto>(),
            null,
            null);

    // ── GET /api/orders ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetActive_WhenAuthenticated_Returns200()
    {
        IReadOnlyList<OrderDto> orders = new[] { MakeOrderDto() };
        _orderMock
            .Setup(s => s.GetActiveOrdersAsync(It.IsAny<Guid>(), It.IsAny<UserRole>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<IReadOnlyList<OrderDto>>.Success(orders));

        var response = await _factory.CreateClientWithRole("Waiter").GetAsync("/api/orders");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetActive_WhenUnauthenticated_Returns401()
    {
        var response = await _factory.CreateClient().GetAsync("/api/orders");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── GET /api/orders/{id} ─────────────────────────────────────────────────────────

    [Fact]
    public async Task GetById_WhenFound_Returns200()
    {
        var id  = Guid.NewGuid();
        var dto = MakeOrderDto(id);
        _orderMock
            .Setup(s => s.GetByIdAsync(id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<OrderDto>.Success(dto));

        var response = await _factory.CreateClientWithRole("Waiter").GetAsync($"/api/orders/{id}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetById_WhenNotFound_Returns404()
    {
        var id = Guid.NewGuid();
        _orderMock
            .Setup(s => s.GetByIdAsync(id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<OrderDto>.Failure(ResultError.NotFound, "Order not found."));

        var response = await _factory.CreateClientWithRole("Waiter").GetAsync($"/api/orders/{id}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── POST /api/orders (Admin, Manager, Waiter) ────────────────────────────────────

    [Fact]
    public async Task Create_AsWaiter_WithoutTable_Returns200()
    {
        var dto = MakeOrderDto();
        _orderMock
            .Setup(s => s.CreateOrderAsync(It.IsAny<CreateOrderRequest>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<OrderDto>.Success(dto));

        var request = new CreateOrderRequest(
            "Alice",
            OrderChannel.DineIn,
            2,
            new[] { new CreateOrderItemRequest(Guid.NewGuid(), 1, null) });

        var response = await _factory.CreateClientWithRole("Waiter")
            .PostAsJsonAsync("/api/orders", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Create_AsWaiter_WithTable_FiresTableStatusChanged()
    {
        var tableId = Guid.NewGuid();
        var dto     = MakeOrderDto(tableId: tableId);
        _orderMock
            .Setup(s => s.CreateOrderAsync(It.IsAny<CreateOrderRequest>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<OrderDto>.Success(dto));
        _floorMock
            .Setup(s => s.SetTableStatusAsync(tableId, TableStatus.Occupied, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<bool>.Success(true));

        var request = new CreateOrderRequest(
            "Alice",
            OrderChannel.DineIn,
            2,
            new[] { new CreateOrderItemRequest(Guid.NewGuid(), 1, null) },
            tableId);

        var response = await _factory.CreateClientWithRole("Waiter")
            .PostAsJsonAsync("/api/orders", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        _floorMock.Verify(
            s => s.SetTableStatusAsync(tableId, TableStatus.Occupied, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Create_AsKitchen_Returns403()
    {
        var request = new CreateOrderRequest(
            null,
            OrderChannel.DineIn,
            1,
            new[] { new CreateOrderItemRequest(Guid.NewGuid(), 1, null) });

        var response = await _factory.CreateClientWithRole("Kitchen")
            .PostAsJsonAsync("/api/orders", request);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── PATCH /api/orders/{id}/status ────────────────────────────────────────────────

    [Fact]
    public async Task UpdateStatus_AsKitchen_Returns200()
    {
        var id  = Guid.NewGuid();
        var dto = MakeOrderDto(id) with { Status = OrderStatus.Preparing };
        _orderMock
            .Setup(s => s.UpdateOrderStatusAsync(id, It.IsAny<UpdateOrderStatusRequest>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<OrderDto>.Success(dto));

        var response = await _factory.CreateClientWithRole("Kitchen")
            .PatchAsJsonAsync($"/api/orders/{id}/status", new UpdateOrderStatusRequest(OrderStatus.Preparing));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task UpdateStatus_ToPaid_WithTable_FreesTable()
    {
        var id      = Guid.NewGuid();
        var tableId = Guid.NewGuid();
        var dto     = MakeOrderDto(id, tableId) with { Status = OrderStatus.Paid };
        _orderMock
            .Setup(s => s.UpdateOrderStatusAsync(id, It.IsAny<UpdateOrderStatusRequest>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<OrderDto>.Success(dto));
        _floorMock
            .Setup(s => s.SetTableStatusAsync(tableId, TableStatus.Available, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<bool>.Success(true));

        var response = await _factory.CreateClientWithRole("Manager")
            .PatchAsJsonAsync($"/api/orders/{id}/status",
                new UpdateOrderStatusRequest(OrderStatus.Paid, PaymentMode.Cash));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        _floorMock.Verify(
            s => s.SetTableStatusAsync(tableId, TableStatus.Available, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    // ── PATCH /api/orders/{id}/items ─────────────────────────────────────────────────

    [Fact]
    public async Task AddItems_AsWaiter_Returns200()
    {
        var id  = Guid.NewGuid();
        var dto = MakeOrderDto(id);
        _orderMock
            .Setup(s => s.AddItemsAsync(id, It.IsAny<AddItemsRequest>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<OrderDto>.Success(dto));

        var request = new AddItemsRequest(
            new[] { new CreateOrderItemRequest(Guid.NewGuid(), 2, "Extra sauce") });

        var response = await _factory.CreateClientWithRole("Waiter")
            .PatchAsJsonAsync($"/api/orders/{id}/items", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task AddItems_WhenOrderIsPreparing_Returns200()
    {
        var id  = Guid.NewGuid();
        var dto = MakeOrderDto(id) with { Status = OrderStatus.Preparing };
        _orderMock
            .Setup(s => s.AddItemsAsync(id, It.IsAny<AddItemsRequest>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<OrderDto>.Success(dto));

        var request = new AddItemsRequest(
            new[] { new CreateOrderItemRequest(Guid.NewGuid(), 1, null) });

        var response = await _factory.CreateClientWithRole("Waiter")
            .PatchAsJsonAsync($"/api/orders/{id}/items", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task AddItems_WhenOrderIsPaid_Returns409()
    {
        var id = Guid.NewGuid();
        _orderMock
            .Setup(s => s.AddItemsAsync(id, It.IsAny<AddItemsRequest>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<OrderDto>.Failure(
                ResultError.Conflict,
                "Cannot add items to an order that has already been paid."));

        var request = new AddItemsRequest(
            new[] { new CreateOrderItemRequest(Guid.NewGuid(), 1, null) });

        var response = await _factory.CreateClientWithRole("Waiter")
            .PatchAsJsonAsync($"/api/orders/{id}/items", request);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task AddItems_AsKitchen_Returns403()
    {
        var request = new AddItemsRequest(
            new[] { new CreateOrderItemRequest(Guid.NewGuid(), 1, null) });

        var response = await _factory.CreateClientWithRole("Kitchen")
            .PatchAsJsonAsync($"/api/orders/{Guid.NewGuid()}/items", request);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── PATCH /api/orders/{id}/assign-waiter (Admin only) ────────────────────────────

    [Fact]
    public async Task AssignWaiter_AsAdmin_Returns200()
    {
        var id      = Guid.NewGuid();
        var waiter  = Guid.NewGuid();
        var dto     = MakeOrderDto(id);
        _orderMock
            .Setup(s => s.AssignWaiterAsync(id, waiter, It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<OrderDto>.Success(dto));

        var response = await _factory.CreateClientWithRole("Admin")
            .PatchAsJsonAsync($"/api/orders/{id}/assign-waiter", new AssignWaiterRequest(waiter));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task AssignWaiter_AsWaiter_Returns403()
    {
        var response = await _factory.CreateClientWithRole("Waiter")
            .PatchAsJsonAsync($"/api/orders/{Guid.NewGuid()}/assign-waiter",
                new AssignWaiterRequest(Guid.NewGuid()));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
