using DineFlow.Application.DTOs.Dashboard;
using DineFlow.Domain.Common;

namespace DineFlow.Application.Services;

public interface IDashboardService
{
    Task<Result<DashboardStatsDto>> GetStatsAsync(CancellationToken ct = default);
}
