using System.Net;
using System.Net.Http.Json;
using DineFlow.Application.DTOs.Floor;
using DineFlow.Application.Services;
using DineFlow.Domain.Common;
using DineFlow.Tests.Controllers.Helpers;
using FluentAssertions;
using Moq;

namespace DineFlow.Tests.Controllers;

public class FloorsControllerTests : IClassFixture<DineFlowWebApplicationFactory>
{
    private readonly DineFlowWebApplicationFactory _factory;
    private readonly Mock<IFloorService> _serviceMock;

    public FloorsControllerTests(DineFlowWebApplicationFactory factory)
    {
        _factory     = factory;
        _serviceMock = factory.FloorServiceMock;
        _serviceMock.Reset();
    }

    private static FloorDto MakeFloorDto(Guid? id = null) =>
        new() { Id = id ?? Guid.NewGuid(), Name = "Ground Floor", DisplayOrder = 1, Tables = new() };

    private static RestaurantTableDto MakeTableDto(Guid? id = null, Guid? floorId = null) =>
        new() { Id = id ?? Guid.NewGuid(), FloorId = floorId ?? Guid.NewGuid(), TableNumber = "T1", Capacity = 4, Shape = "Rectangle" };

    // ── GET /api/floors ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_WhenAuthenticated_Returns200()
    {
        _serviceMock
            .Setup(s => s.GetAllFloorsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<List<FloorDto>>.Success(new List<FloorDto> { MakeFloorDto() }));

        var response = await _factory.CreateClientWithRole("Waiter").GetAsync("/api/floors");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetAll_WhenUnauthenticated_Returns401()
    {
        var response = await _factory.CreateClient().GetAsync("/api/floors");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── POST /api/floors (Admin only) ────────────────────────────────────────────────

    [Fact]
    public async Task Create_AsAdmin_Returns200()
    {
        var dto = MakeFloorDto();
        _serviceMock
            .Setup(s => s.CreateFloorAsync(It.IsAny<CreateFloorRequest>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<FloorDto>.Success(dto));

        var response = await _factory.CreateClientWithRole("Admin")
            .PostAsJsonAsync("/api/floors", new CreateFloorRequest { Name = "Ground Floor", DisplayOrder = 1 });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Create_AsWaiter_Returns403()
    {
        var response = await _factory.CreateClientWithRole("Waiter")
            .PostAsJsonAsync("/api/floors", new CreateFloorRequest { Name = "Ground Floor", DisplayOrder = 1 });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── PUT /api/floors/{id} (Admin only) ────────────────────────────────────────────

    [Fact]
    public async Task Update_AsAdmin_Returns200()
    {
        var id  = Guid.NewGuid();
        var dto = MakeFloorDto(id);
        _serviceMock
            .Setup(s => s.UpdateFloorAsync(id, It.IsAny<UpdateFloorRequest>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<FloorDto>.Success(dto));

        var response = await _factory.CreateClientWithRole("Admin")
            .PutAsJsonAsync($"/api/floors/{id}", new UpdateFloorRequest { Name = "Updated Floor", DisplayOrder = 1 });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Update_WhenNotFound_Returns404()
    {
        var id = Guid.NewGuid();
        _serviceMock
            .Setup(s => s.UpdateFloorAsync(id, It.IsAny<UpdateFloorRequest>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<FloorDto>.Failure(ResultError.NotFound, "Floor not found."));

        var response = await _factory.CreateClientWithRole("Admin")
            .PutAsJsonAsync($"/api/floors/{id}", new UpdateFloorRequest { Name = "X", DisplayOrder = 1 });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── DELETE /api/floors/{id} (Admin only) ─────────────────────────────────────────

    [Fact]
    public async Task Delete_AsAdmin_Returns200()
    {
        var id = Guid.NewGuid();
        _serviceMock
            .Setup(s => s.DeleteFloorAsync(id, It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<bool>.Success(true));

        var response = await _factory.CreateClientWithRole("Admin").DeleteAsync($"/api/floors/{id}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Delete_AsManager_Returns403()
    {
        var response = await _factory.CreateClientWithRole("Manager")
            .DeleteAsync($"/api/floors/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── POST /api/floors/{floorId}/tables (Admin only) ───────────────────────────────

    [Fact]
    public async Task CreateTable_AsAdmin_Returns200()
    {
        var floorId  = Guid.NewGuid();
        var tableDto = MakeTableDto(floorId: floorId);
        _serviceMock
            .Setup(s => s.CreateTableAsync(It.IsAny<CreateTableRequest>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<RestaurantTableDto>.Success(tableDto));

        var response = await _factory.CreateClientWithRole("Admin")
            .PostAsJsonAsync($"/api/floors/{floorId}/tables", new CreateTableRequest
            {
                TableNumber = "T1", Capacity = 4, Shape = "Rectangle",
                PositionX = 10, PositionY = 20, Width = 80, Height = 60
            });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task CreateTable_AsWaiter_Returns403()
    {
        var floorId = Guid.NewGuid();
        var response = await _factory.CreateClientWithRole("Waiter")
            .PostAsJsonAsync($"/api/floors/{floorId}/tables", new CreateTableRequest
            {
                TableNumber = "T1", Capacity = 4, Shape = "Rectangle"
            });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── PUT /api/floors/tables/{id} (Admin only) ─────────────────────────────────────

    [Fact]
    public async Task UpdateTable_AsAdmin_Returns200()
    {
        var id  = Guid.NewGuid();
        var dto = MakeTableDto(id);
        _serviceMock
            .Setup(s => s.UpdateTableAsync(id, It.IsAny<UpdateTableRequest>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<RestaurantTableDto>.Success(dto));

        var response = await _factory.CreateClientWithRole("Admin")
            .PutAsJsonAsync($"/api/floors/tables/{id}", new UpdateTableRequest
            {
                TableNumber = "T1-updated", Capacity = 6, Shape = "Round",
                Status = "Available"
            });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ── DELETE /api/floors/tables/{id} (Admin only) ──────────────────────────────────

    [Fact]
    public async Task DeleteTable_AsAdmin_Returns200()
    {
        var id = Guid.NewGuid();
        _serviceMock
            .Setup(s => s.DeleteTableAsync(id, It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<bool>.Success(true));

        var response = await _factory.CreateClientWithRole("Admin")
            .DeleteAsync($"/api/floors/tables/{id}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ── PUT /api/floors/{floorId}/layout (Admin or Manager) ──────────────────────────

    [Fact]
    public async Task SaveLayout_AsManager_Returns200()
    {
        var floorId = Guid.NewGuid();
        _serviceMock
            .Setup(s => s.SaveLayoutAsync(floorId, It.IsAny<SaveLayoutRequest>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<bool>.Success(true));

        var response = await _factory.CreateClientWithRole("Manager")
            .PutAsJsonAsync($"/api/floors/{floorId}/layout", new SaveLayoutRequest { Tables = new() });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task SaveLayout_AsWaiter_Returns403()
    {
        var floorId = Guid.NewGuid();
        var response = await _factory.CreateClientWithRole("Waiter")
            .PutAsJsonAsync($"/api/floors/{floorId}/layout", new SaveLayoutRequest { Tables = new() });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── GET /api/floors/live ─────────────────────────────────────────────────────────

    [Fact]
    public async Task GetLive_WhenAuthenticated_Returns200()
    {
        IReadOnlyList<FloorLiveDto> live = new[]
        {
            new FloorLiveDto(Guid.NewGuid(), "Ground Floor", 1, Array.Empty<TableLiveDto>()),
        };
        _serviceMock
            .Setup(s => s.GetLiveFloorsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<IReadOnlyList<FloorLiveDto>>.Success(live));

        var response = await _factory.CreateClientWithRole("Waiter").GetAsync("/api/floors/live");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
