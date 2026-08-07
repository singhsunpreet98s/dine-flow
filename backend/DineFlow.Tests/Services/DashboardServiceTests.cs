using System.Globalization;
using DineFlow.Application.DTOs.Dashboard;
using DineFlow.Domain.Entities;
using DineFlow.Domain.Enums;
using DineFlow.Infrastructure.Persistence;
using DineFlow.Infrastructure.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace DineFlow.Tests.Services;

/// <summary>
/// Unit tests for <see cref="DashboardService.GetStatsAsync"/>.
/// Uses EF Core InMemory database so every test starts from a clean, isolated store.
/// </summary>
public class DashboardServiceTests : IDisposable
{
    private readonly DineFlowDbContext _context;
    private readonly DashboardService _sut;

    public DashboardServiceTests()
    {
        // Each test gets its own in-memory database — no shared state.
        var options = new DbContextOptionsBuilder<DineFlowDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _context = new DineFlowDbContext(options);
        _sut = new DashboardService(_context);
    }

    public void Dispose() => _context.Dispose();

    // ── seed helpers ──────────────────────────────────────────────────────────

    /// <summary>
    /// Adds an <see cref="Order"/> to the context.
    /// Status is set via the EF Core entry API to bypass the private setter.
    /// </summary>
    private Order AddOrder(
        OrderStatus status = OrderStatus.Placed,
        DateTime? createdAt = null,
        bool isDeleted = false,
        decimal totalAmount = 0m,
        PaymentMode? paymentMode = null,
        OrderChannel channel = OrderChannel.DineIn)
    {
        var order = new Order
        {
            OrderNumber = Guid.NewGuid().ToString("N")[..6],
            Channel = channel,
            TotalAmount = totalAmount,
            PaymentMode = paymentMode,
            CreatedAt = createdAt ?? DateTime.UtcNow,
            CreatedBy = "test",
            UpdatedAt = createdAt ?? DateTime.UtcNow,
            UpdatedBy = "test",
            IsDeleted = isDeleted,
        };

        _context.Orders.Add(order);

        // Order.Status has a private setter — use EF Core's entry API to bypass it.
        _context.Entry(order).Property("Status").CurrentValue = status;

        return order;
    }

    private RestaurantTable AddTable(TableStatus status = TableStatus.Available, bool isDeleted = false)
    {
        var table = new RestaurantTable
        {
            FloorId = Guid.NewGuid(), // InMemory does not enforce FK constraints
            TableNumber = $"T-{Guid.NewGuid():N}"[..6],
            Capacity = 4,
            Status = status,
            IsDeleted = isDeleted,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = "test",
            UpdatedAt = DateTime.UtcNow,
            UpdatedBy = "test",
        };

        _context.RestaurantTables.Add(table);
        return table;
    }

    /// <summary>
    /// Adds a <see cref="MenuItem"/> and an <see cref="OrderItem"/> linked to
    /// <paramref name="order"/>. Navigation fixup occurs automatically in
    /// InMemory because both entities are tracked in the same context.
    /// </summary>
    private void AddOrderItem(Order order, string itemName, int qty)
    {
        var menuItem = new MenuItem
        {
            Name = itemName,
            CategoryId = Guid.NewGuid(), // InMemory does not enforce FK constraints
            Price = 100m,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = "test",
            UpdatedAt = DateTime.UtcNow,
            UpdatedBy = "test",
        };
        _context.MenuItems.Add(menuItem);

        var orderItem = new OrderItem
        {
            OrderId = order.Id,
            MenuItemId = menuItem.Id,
            Quantity = qty,
            UnitPrice = 100m,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = "test",
            UpdatedAt = DateTime.UtcNow,
            UpdatedBy = "test",
        };
        _context.OrderItems.Add(orderItem);
    }

    // ── tests ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetStatsAsync_WithEmptyDatabase_ReturnsSuccessWithAllZeros()
    {
        var result = await _sut.GetStatsAsync();

        result.IsSuccess.Should().BeTrue();
        var dto = result.Value!;

        dto.TotalOrders.Should().Be(0);
        dto.TodayOrders.Should().Be(0);
        dto.PendingOrders.Should().Be(0);
        dto.DelayedOrders.Should().Be(0);
        dto.TodayIncome.Should().Be(0m);
        dto.TablesOccupied.Should().Be(0);
        dto.TotalTables.Should().Be(0);
        dto.CancelledOrders.Should().Be(0);
        dto.DailyOrders.Should().HaveCount(14);
        dto.DailyOrders.Should().AllSatisfy(p => p.Orders.Should().Be(0));
        dto.IncomeByMode.Should().BeEmpty();
        dto.OrdersByChannel.Should().BeEmpty();
        dto.TopItems.Should().BeEmpty();
    }

    [Fact]
    public async Task GetStatsAsync_TotalOrders_ExcludesSoftDeletedOrders()
    {
        AddOrder();
        AddOrder();
        AddOrder(isDeleted: true); // soft-deleted — must not count

        await _context.SaveChangesAsync();

        var result = await _sut.GetStatsAsync();

        result.Value!.TotalOrders.Should().Be(2);
    }

    [Fact]
    public async Task GetStatsAsync_TodayOrders_CountsOnlyTodaysNonDeletedOrders()
    {
        AddOrder(createdAt: DateTime.UtcNow);             // today ✓
        AddOrder(createdAt: DateTime.UtcNow);             // today ✓
        AddOrder(createdAt: DateTime.UtcNow.AddDays(-1)); // yesterday ✗

        await _context.SaveChangesAsync();

        var result = await _sut.GetStatsAsync();

        result.Value!.TodayOrders.Should().Be(2);
    }

    [Fact]
    public async Task GetStatsAsync_PendingOrders_IncludesAllActiveStatuses()
    {
        AddOrder(OrderStatus.Placed);
        AddOrder(OrderStatus.SentToKitchen);
        AddOrder(OrderStatus.Preparing);
        AddOrder(OrderStatus.OutOfStock);
        AddOrder(OrderStatus.Prepared);
        AddOrder(OrderStatus.Served);
        AddOrder(OrderStatus.Billed);
        AddOrder(OrderStatus.Paid);   // terminal — not pending ✗
        AddOrder(OrderStatus.Closed); // terminal — not pending ✗

        await _context.SaveChangesAsync();

        var result = await _sut.GetStatsAsync();

        result.Value!.PendingOrders.Should().Be(7);
    }

    [Fact]
    public async Task GetStatsAsync_DelayedOrders_CountsPendingOrdersOlderThan30Minutes()
    {
        AddOrder(OrderStatus.Placed, createdAt: DateTime.UtcNow.AddMinutes(-45));  // delayed ✓
        AddOrder(OrderStatus.Preparing, createdAt: DateTime.UtcNow.AddMinutes(-31)); // delayed ✓
        AddOrder(OrderStatus.Placed, createdAt: DateTime.UtcNow.AddMinutes(-10));  // too recent ✗
        AddOrder(OrderStatus.Paid);   // not in pending statuses ✗

        await _context.SaveChangesAsync();

        var result = await _sut.GetStatsAsync();

        result.Value!.DelayedOrders.Should().Be(2);
    }

    [Fact]
    public async Task GetStatsAsync_TodayIncome_SumsPaidAndClosedOrderAmountsForToday()
    {
        AddOrder(OrderStatus.Paid, createdAt: DateTime.UtcNow, totalAmount: 500m, paymentMode: PaymentMode.Cash);
        AddOrder(OrderStatus.Closed, createdAt: DateTime.UtcNow, totalAmount: 300m, paymentMode: PaymentMode.UPI);
        AddOrder(OrderStatus.Placed, createdAt: DateTime.UtcNow, totalAmount: 200m);  // not paid ✗
        AddOrder(OrderStatus.Paid, createdAt: DateTime.UtcNow.AddDays(-1), totalAmount: 1000m); // yesterday ✗

        await _context.SaveChangesAsync();

        var result = await _sut.GetStatsAsync();

        result.Value!.TodayIncome.Should().Be(800m);
    }

    [Fact]
    public async Task GetStatsAsync_TablesOccupied_CountsOnlyNonDeletedOccupiedTables()
    {
        AddTable(TableStatus.Occupied);           // ✓
        AddTable(TableStatus.Occupied);           // ✓
        AddTable(TableStatus.Available);          // wrong status ✗
        AddTable(TableStatus.Occupied, isDeleted: true); // soft-deleted ✗

        await _context.SaveChangesAsync();

        var result = await _sut.GetStatsAsync();

        result.Value!.TablesOccupied.Should().Be(2);
    }

    [Fact]
    public async Task GetStatsAsync_TotalTables_CountsAllNonDeletedTables()
    {
        AddTable(TableStatus.Available);
        AddTable(TableStatus.Occupied);
        AddTable(TableStatus.Reserved, isDeleted: true); // soft-deleted ✗

        await _context.SaveChangesAsync();

        var result = await _sut.GetStatsAsync();

        result.Value!.TotalTables.Should().Be(2);
    }

    [Fact]
    public async Task GetStatsAsync_CancelledOrders_CountsTodaysSoftDeletedOrders()
    {
        AddOrder(isDeleted: true, createdAt: DateTime.UtcNow);            // cancelled today ✓
        AddOrder(isDeleted: true, createdAt: DateTime.UtcNow.AddDays(-1)); // yesterday ✗
        AddOrder(isDeleted: false, createdAt: DateTime.UtcNow);           // not cancelled ✗

        await _context.SaveChangesAsync();

        var result = await _sut.GetStatsAsync();

        result.Value!.CancelledOrders.Should().Be(1);
    }

    [Fact]
    public async Task GetStatsAsync_DailyOrders_ReturnsExactly14Points()
    {
        var result = await _sut.GetStatsAsync();

        result.Value!.DailyOrders.Should().HaveCount(14);
    }

    [Fact]
    public async Task GetStatsAsync_DailyOrders_LastPointIsToday()
    {
        var result = await _sut.GetStatsAsync();

        var expectedLabel = DateTime.UtcNow.Date.ToString("MMM d", CultureInfo.InvariantCulture);
        result.Value!.DailyOrders.Last().Date.Should().Be(expectedLabel);
    }

    [Fact]
    public async Task GetStatsAsync_DailyOrders_FirstPointIs13DaysAgo()
    {
        var result = await _sut.GetStatsAsync();

        var expectedLabel = DateTime.UtcNow.Date.AddDays(-13).ToString("MMM d", CultureInfo.InvariantCulture);
        result.Value!.DailyOrders.First().Date.Should().Be(expectedLabel);
    }

    [Fact]
    public async Task GetStatsAsync_DailyOrders_FillsMissingDatesWithZero()
    {
        // Add exactly one order 3 days ago (index 10 in the 14-day series).
        AddOrder(createdAt: DateTime.UtcNow.Date.AddDays(-3).AddHours(12));
        await _context.SaveChangesAsync();

        var result = await _sut.GetStatsAsync();
        var series = result.Value!.DailyOrders;

        // Enumerable.Range(0,14) → date = today.AddDays(-13 + i); i=10 → today-3
        series[10].Orders.Should().Be(1);
        series.Where((_, i) => i != 10).Should().AllSatisfy(p => p.Orders.Should().Be(0));
    }

    [Fact]
    public async Task GetStatsAsync_IncomeByMode_GroupsAndSumsByPaymentMode()
    {
        AddOrder(OrderStatus.Paid, createdAt: DateTime.UtcNow, totalAmount: 200m, paymentMode: PaymentMode.Cash);
        AddOrder(OrderStatus.Paid, createdAt: DateTime.UtcNow, totalAmount: 150m, paymentMode: PaymentMode.Cash);
        AddOrder(OrderStatus.Paid, createdAt: DateTime.UtcNow, totalAmount: 300m, paymentMode: PaymentMode.UPI);
        AddOrder(OrderStatus.Paid, createdAt: DateTime.UtcNow.AddDays(-1), totalAmount: 999m, paymentMode: PaymentMode.Cash); // yesterday ✗

        await _context.SaveChangesAsync();

        var result = await _sut.GetStatsAsync();
        var income = result.Value!.IncomeByMode;

        income.Should().HaveCount(2);
        income.Single(x => x.Mode == "Cash").Amount.Should().Be(350m);
        income.Single(x => x.Mode == "UPI").Amount.Should().Be(300m);
    }

    [Fact]
    public async Task GetStatsAsync_IncomeByMode_ExcludesOrdersWithNullPaymentMode()
    {
        // A Paid order that somehow has no PaymentMode (should not appear in breakdown)
        AddOrder(OrderStatus.Paid, createdAt: DateTime.UtcNow, totalAmount: 100m, paymentMode: null);

        await _context.SaveChangesAsync();

        var result = await _sut.GetStatsAsync();

        result.Value!.IncomeByMode.Should().BeEmpty();
    }

    [Fact]
    public async Task GetStatsAsync_OrdersByChannel_GroupsByChannel()
    {
        AddOrder(channel: OrderChannel.DineIn, createdAt: DateTime.UtcNow);
        AddOrder(channel: OrderChannel.DineIn, createdAt: DateTime.UtcNow);
        AddOrder(channel: OrderChannel.Zomato, createdAt: DateTime.UtcNow);
        AddOrder(channel: OrderChannel.Swiggy, createdAt: DateTime.UtcNow.AddDays(-1)); // yesterday ✗

        await _context.SaveChangesAsync();

        var result = await _sut.GetStatsAsync();
        var channels = result.Value!.OrdersByChannel;

        channels.Single(x => x.Channel == "DineIn").Count.Should().Be(2);
        channels.Single(x => x.Channel == "Zomato").Count.Should().Be(1);
        channels.Should().NotContain(x => x.Channel == "Swiggy");
    }

    [Fact]
    public async Task GetStatsAsync_TopItems_ReturnsTop5ByQuantityDescending()
    {
        var order = AddOrder(createdAt: DateTime.UtcNow);
        AddOrderItem(order, "Burger", 10);
        AddOrderItem(order, "Pizza", 8);
        AddOrderItem(order, "Pasta", 6);
        AddOrderItem(order, "Salad", 4);
        AddOrderItem(order, "Soda", 3);
        AddOrderItem(order, "Coffee", 2); // 6th — must be excluded

        await _context.SaveChangesAsync();

        var result = await _sut.GetStatsAsync();
        var top = result.Value!.TopItems;

        top.Should().HaveCount(5);
        top.First().Name.Should().Be("Burger");
        top.First().Count.Should().Be(10);
        top.Should().NotContain(x => x.Name == "Coffee");
    }

    [Fact]
    public async Task GetStatsAsync_TopItems_OnlyCountsTodaysOrders()
    {
        var todayOrder = AddOrder(createdAt: DateTime.UtcNow);
        AddOrderItem(todayOrder, "Burger", 5);

        var yesterdayOrder = AddOrder(createdAt: DateTime.UtcNow.AddDays(-1));
        AddOrderItem(yesterdayOrder, "Pizza", 100); // large qty but yesterday — excluded

        await _context.SaveChangesAsync();

        var result = await _sut.GetStatsAsync();
        var top = result.Value!.TopItems;

        top.Should().ContainSingle(x => x.Name == "Burger");
        top.Should().NotContain(x => x.Name == "Pizza");
    }

    [Fact]
    public async Task GetStatsAsync_DailyAverage_ComputesAverageOrdersPerDayOverLast30Days()
    {
        // 2 orders today + 4 orders yesterday = 6 over 2 active days → average = 3.0
        AddOrder(createdAt: DateTime.UtcNow);
        AddOrder(createdAt: DateTime.UtcNow);
        AddOrder(createdAt: DateTime.UtcNow.AddDays(-1));
        AddOrder(createdAt: DateTime.UtcNow.AddDays(-1));
        AddOrder(createdAt: DateTime.UtcNow.AddDays(-1));
        AddOrder(createdAt: DateTime.UtcNow.AddDays(-1));

        await _context.SaveChangesAsync();

        var result = await _sut.GetStatsAsync();

        result.Value!.DailyAverage.Should().Be(3.0);
    }

    [Fact]
    public async Task GetStatsAsync_DailyAverage_IsZeroWhenNoOrdersInLast30Days()
    {
        // Order older than 30 days — must not affect average
        AddOrder(createdAt: DateTime.UtcNow.AddDays(-31));
        await _context.SaveChangesAsync();

        var result = await _sut.GetStatsAsync();

        result.Value!.DailyAverage.Should().Be(0.0);
    }
}
