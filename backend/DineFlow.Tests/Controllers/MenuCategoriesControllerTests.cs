using System.Net;
using System.Net.Http.Json;
using DineFlow.Application.DTOs.Menu;
using DineFlow.Application.Services;
using DineFlow.Domain.Common;
using DineFlow.Tests.Controllers.Helpers;
using FluentAssertions;
using Moq;

namespace DineFlow.Tests.Controllers;

public class MenuCategoriesControllerTests : IClassFixture<DineFlowWebApplicationFactory>
{
    private readonly DineFlowWebApplicationFactory _factory;
    private readonly Mock<IMenuCategoryService> _serviceMock;

    public MenuCategoriesControllerTests(DineFlowWebApplicationFactory factory)
    {
        _factory     = factory;
        _serviceMock = factory.MenuCategoryServiceMock;
        _serviceMock.Reset();
    }

    // ── GET /api/menu/categories ─────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_WhenAuthenticated_Returns200WithList()
    {
        IReadOnlyList<MenuCategoryDto> categories = new[]
        {
            new MenuCategoryDto(Guid.NewGuid(), "Starters", 1, true, 4),
            new MenuCategoryDto(Guid.NewGuid(), "Mains",    2, true, 6),
        };
        _serviceMock
            .Setup(s => s.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<IReadOnlyList<MenuCategoryDto>>.Success(categories));

        var response = await _factory.CreateClientWithRole("Waiter").GetAsync("/api/menu/categories");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetAll_WhenUnauthenticated_Returns401()
    {
        var response = await _factory.CreateClient().GetAsync("/api/menu/categories");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── POST /api/menu/categories (Admin only) ───────────────────────────────────────

    [Fact]
    public async Task Create_AsAdmin_Returns200WithCategory()
    {
        var created = new MenuCategoryDto(Guid.NewGuid(), "Desserts", 3, true, 0);
        _serviceMock
            .Setup(s => s.CreateAsync(It.IsAny<CreateMenuCategoryRequest>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<MenuCategoryDto>.Success(created));

        var response = await _factory.CreateClientWithRole("Admin")
            .PostAsJsonAsync("/api/menu/categories", new CreateMenuCategoryRequest("Desserts", 3, true));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Create_AsWaiter_Returns403()
    {
        var response = await _factory.CreateClientWithRole("Waiter")
            .PostAsJsonAsync("/api/menu/categories", new CreateMenuCategoryRequest("Desserts", 3, true));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Create_WhenNameConflict_Returns409()
    {
        _serviceMock
            .Setup(s => s.CreateAsync(It.IsAny<CreateMenuCategoryRequest>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<MenuCategoryDto>.Failure(ResultError.Conflict, "Category name already exists."));

        var response = await _factory.CreateClientWithRole("Admin")
            .PostAsJsonAsync("/api/menu/categories", new CreateMenuCategoryRequest("Starters", 1, true));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    // ── PUT /api/menu/categories/{id} (Admin only) ───────────────────────────────────

    [Fact]
    public async Task Update_AsAdmin_Returns200()
    {
        var id      = Guid.NewGuid();
        var updated = new MenuCategoryDto(id, "Starters Updated", 1, true, 4);
        _serviceMock
            .Setup(s => s.UpdateAsync(id, It.IsAny<UpdateMenuCategoryRequest>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<MenuCategoryDto>.Success(updated));

        var response = await _factory.CreateClientWithRole("Admin")
            .PutAsJsonAsync($"/api/menu/categories/{id}", new UpdateMenuCategoryRequest("Starters Updated", 1, true));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Update_WhenNotFound_Returns404()
    {
        var id = Guid.NewGuid();
        _serviceMock
            .Setup(s => s.UpdateAsync(id, It.IsAny<UpdateMenuCategoryRequest>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<MenuCategoryDto>.Failure(ResultError.NotFound, "Category not found."));

        var response = await _factory.CreateClientWithRole("Admin")
            .PutAsJsonAsync($"/api/menu/categories/{id}", new UpdateMenuCategoryRequest("X", 1, true));

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── DELETE /api/menu/categories/{id} (Admin only) ────────────────────────────────

    [Fact]
    public async Task Delete_AsAdmin_Returns200()
    {
        var id = Guid.NewGuid();
        _serviceMock
            .Setup(s => s.DeleteAsync(id, It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<bool>.Success(true));

        var response = await _factory.CreateClientWithRole("Admin")
            .DeleteAsync($"/api/menu/categories/{id}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Delete_WhenNotFound_Returns404()
    {
        var id = Guid.NewGuid();
        _serviceMock
            .Setup(s => s.DeleteAsync(id, It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<bool>.Failure(ResultError.NotFound, "Category not found."));

        var response = await _factory.CreateClientWithRole("Admin")
            .DeleteAsync($"/api/menu/categories/{id}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Delete_AsWaiter_Returns403()
    {
        var response = await _factory.CreateClientWithRole("Waiter")
            .DeleteAsync($"/api/menu/categories/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
