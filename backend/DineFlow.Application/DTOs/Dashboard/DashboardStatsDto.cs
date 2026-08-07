namespace DineFlow.Application.DTOs.Dashboard;

public record DailyOrderPointDto(string Date, int Orders);
public record IncomeByModeDto(string Mode, decimal Amount);
public record OrdersByChannelDto(string Channel, int Count);
public record TopItemDto(string Name, int Count);

public record DashboardStatsDto
{
    public int TotalOrders { get; init; }
    public int TodayOrders { get; init; }
    public int PendingOrders { get; init; }
    public int DelayedOrders { get; init; }
    public double DailyAverage { get; init; }
    public decimal TodayIncome { get; init; }
    public int TablesOccupied { get; init; }
    public int TotalTables { get; init; }
    public int CancelledOrders { get; init; }
    public List<DailyOrderPointDto> DailyOrders { get; init; } = [];
    public List<IncomeByModeDto> IncomeByMode { get; init; } = [];
    public List<OrdersByChannelDto> OrdersByChannel { get; init; } = [];
    public List<TopItemDto> TopItems { get; init; } = [];
}
