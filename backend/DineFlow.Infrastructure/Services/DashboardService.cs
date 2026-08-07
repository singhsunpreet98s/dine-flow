using System.Globalization;
using DineFlow.Application.DTOs.Dashboard;
using DineFlow.Application.Services;
using DineFlow.Domain.Common;
using DineFlow.Domain.Enums;
using DineFlow.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DineFlow.Infrastructure.Services;

public class DashboardService : IDashboardService
{
    private readonly DineFlowDbContext _context;

    public DashboardService(DineFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<DashboardStatsDto>> GetStatsAsync(CancellationToken ct = default)
    {
        try
        {
            var today = DateTime.UtcNow.Date;
            var todayStart = today;
            var tomorrowStart = today.AddDays(1);

            // Statuses that represent an order still in progress
            var pendingStatuses = new[]
            {
                OrderStatus.Placed,
                OrderStatus.SentToKitchen,
                OrderStatus.Preparing,
                OrderStatus.OutOfStock,
                OrderStatus.Prepared,
                OrderStatus.Served,
                OrderStatus.Billed
            };

            // --- scalar counts (sequential — DbContext is not thread-safe) ---

            var totalOrders = await _context.Orders
                .CountAsync(o => !o.IsDeleted, ct);

            var todayOrders = await _context.Orders
                .CountAsync(o => !o.IsDeleted
                    && o.CreatedAt >= todayStart
                    && o.CreatedAt < tomorrowStart, ct);

            var pendingOrders = await _context.Orders
                .CountAsync(o => !o.IsDeleted
                    && pendingStatuses.Contains(o.Status), ct);

            var delayedOrders = await _context.Orders
                .CountAsync(o => !o.IsDeleted
                    && pendingStatuses.Contains(o.Status)
                    && o.CreatedAt < DateTime.UtcNow.AddMinutes(-30), ct);

            var todayIncome = await _context.Orders
                .Where(o => !o.IsDeleted
                    && (o.Status == OrderStatus.Paid || o.Status == OrderStatus.Closed)
                    && o.CreatedAt >= todayStart
                    && o.CreatedAt < tomorrowStart)
                .SumAsync(o => o.TotalAmount, ct);

            var tablesOccupied = await _context.RestaurantTables
                .CountAsync(t => !t.IsDeleted && t.Status == TableStatus.Occupied, ct);

            var totalTables = await _context.RestaurantTables
                .CountAsync(t => !t.IsDeleted, ct);

            var cancelledOrders = await _context.Orders
                .IgnoreQueryFilters()
                .CountAsync(o => o.IsDeleted
                    && o.CreatedAt >= todayStart
                    && o.CreatedAt < tomorrowStart, ct);

            // --- DailyAverage: last 30 days, computed in memory ---

            var thirtyDaysAgo = today.AddDays(-30);
            var last30DaysDates = await _context.Orders
                .Where(o => !o.IsDeleted && o.CreatedAt >= thirtyDaysAgo)
                .Select(o => o.CreatedAt)
                .ToListAsync(ct);

            var dailyAverage = last30DaysDates.Count == 0
                ? 0.0
                : Math.Round(
                    last30DaysDates
                        .GroupBy(d => d.Date)
                        .Average(g => g.Count()),
                    1);

            // --- DailyOrders: last 14 days, fill missing dates with 0 ---

            var fourteenDaysAgo = today.AddDays(-14);
            var last14DaysDates = await _context.Orders
                .Where(o => !o.IsDeleted && o.CreatedAt >= fourteenDaysAgo)
                .Select(o => o.CreatedAt)
                .ToListAsync(ct);

            var dateCountMap = last14DaysDates
                .GroupBy(d => d.Date)
                .ToDictionary(g => g.Key, g => g.Count());

            var dailyOrders = Enumerable.Range(0, 14)
                .Select(i =>
                {
                    var date = today.AddDays(-13 + i);
                    var label = date.ToString("MMM d", CultureInfo.InvariantCulture);
                    var count = dateCountMap.TryGetValue(date, out var c) ? c : 0;
                    return new DailyOrderPointDto(label, count);
                })
                .ToList();

            // --- IncomeByMode: today, paid/closed, non-deleted ---

            var rawIncome = await _context.Orders
                .Where(o => !o.IsDeleted
                    && (o.Status == OrderStatus.Paid || o.Status == OrderStatus.Closed)
                    && o.CreatedAt >= todayStart
                    && o.CreatedAt < tomorrowStart
                    && o.PaymentMode != null)
                .Select(o => new { o.PaymentMode, o.TotalAmount })
                .ToListAsync(ct);

            var incomeByMode = rawIncome
                .GroupBy(x => x.PaymentMode!.Value)
                .Select(g => new IncomeByModeDto(g.Key.ToString(), g.Sum(x => x.TotalAmount)))
                .ToList();

            // --- OrdersByChannel: today, non-deleted ---

            var rawChannels = await _context.Orders
                .Where(o => !o.IsDeleted
                    && o.CreatedAt >= todayStart
                    && o.CreatedAt < tomorrowStart)
                .Select(o => o.Channel)
                .ToListAsync(ct);

            var ordersByChannel = rawChannels
                .GroupBy(c => c)
                .Select(g => new OrdersByChannelDto(g.Key.ToString(), g.Count()))
                .ToList();

            // --- TopItems: today, non-deleted, top 5 by quantity ---

            var topItemsRaw = await _context.OrderItems
                .Where(oi => !oi.IsDeleted
                    && oi.Order.CreatedAt >= todayStart
                    && oi.Order.CreatedAt < tomorrowStart)
                .GroupBy(oi => oi.MenuItem.Name)
                .Select(g => new { Name = g.Key, Count = g.Sum(oi => oi.Quantity) })
                .OrderByDescending(x => x.Count)
                .Take(5)
                .ToListAsync(ct);

            var topItems = topItemsRaw
                .Select(x => new TopItemDto(x.Name, x.Count))
                .ToList();

            // --- Assemble result ---

            var dto = new DashboardStatsDto
            {
                TotalOrders = totalOrders,
                TodayOrders = todayOrders,
                PendingOrders = pendingOrders,
                DelayedOrders = delayedOrders,
                DailyAverage = dailyAverage,
                TodayIncome = todayIncome,
                TablesOccupied = tablesOccupied,
                TotalTables = totalTables,
                CancelledOrders = cancelledOrders,
                DailyOrders = dailyOrders,
                IncomeByMode = incomeByMode,
                OrdersByChannel = ordersByChannel,
                TopItems = topItems
            };

            return Result<DashboardStatsDto>.Success(dto);
        }
        catch (Exception ex)
        {
            return Result<DashboardStatsDto>.Failure(ResultError.Internal, ex.Message);
        }
    }
}
