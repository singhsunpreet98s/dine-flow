using System.Net;
using DineFlow.Application.DTOs.Dashboard;
using DineFlow.Application.Services;
using DineFlow.Domain.Common;
using DineFlow.Tests.Controllers.Helpers;
using FluentAssertions;
using Moq;

namespace DineFlow.Tests.Controllers;

public class DashboardControllerTests : IClassFixture<DineFlowWebApplicationFactory>
{
    private readonly DineFlowWebApplicationFactory _factory;
    private readonly Mock<IDashboardService> _serviceMock;

    public DashboardControllerTests(DineFlowWebApplicationFactory factory)
    {
        _factory     = factory;
        _serviceMock = factory.DashboardServiceMock;
        _serviceMock.Reset();
    }

    private static DashboardStatsDto MakeStatsDto() =>
        new()
        {
            TotalOrders    = 42,
            TodayOrders    = 10,
            PendingOrders  = 3,
            DelayedOrders  = 1,
            DailyAverage   = 8.4,
            TodayIncome    = 1250m,
            TablesOccupied = 5,
            TotalTables    = 20,
            CancelledOrders = 2,
        };

    // ── GET /api/dashboard/stats ─────────────────────────────────────────────────────

    [Fact]
    public async Task GetStats_WhenAuthenticated_Returns200WithStats()
    {
        _serviceMock
            .Setup(s => s.GetStatsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<DashboardStatsDto>.Success(MakeStatsDto()));

        var response = await _factory.CreateClientWithRole("Admin").GetAsync("/api/dashboard/stats");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetStats_WhenUnauthenticated_Returns401()
    {
        var response = await _factory.CreateClient().GetAsync("/api/dashboard/stats");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetStats_WhenServiceReturnsInternalError_Returns500()
    {
        _serviceMock
            .Setup(s => s.GetStatsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<DashboardStatsDto>.Failure(ResultError.Internal, "Unexpected error."));

        var response = await _factory.CreateClientWithRole("Manager").GetAsync("/api/dashboard/stats");

        response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetStats_AsKitchen_Returns200()
    {
        // Dashboard is [Authorize] — any authenticated role should be allowed
        _serviceMock
            .Setup(s => s.GetStatsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<DashboardStatsDto>.Success(MakeStatsDto()));

        var response = await _factory.CreateClientWithRole("Kitchen").GetAsync("/api/dashboard/stats");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
