using System.Net;
using System.Net.Http.Json;
using DineFlow.Application.DTOs.Menu;
using DineFlow.Application.Services;
using DineFlow.Domain.Common;
using DineFlow.Tests.Controllers.Helpers;
using FluentAssertions;
using Moq;

namespace DineFlow.Tests.Controllers;

public class MenuItemsControllerTests : IClassFixture<DineFlowWebApplicationFactory>
{
    private readonly DineFlowWebApplicationFactory _factory;
    private readonly Mock<IMenuItemService> _serviceMock;

    public MenuItemsControllerTests(DineFlowWebApplicationFactory factory)
    {
        _factory     = factory;
        _serviceMock = factory.MenuItemServiceMock;
        _serviceMock.Reset();
    }

    private static MenuItemDto MakeItemDto(Guid? id = null) =>
        new(id ?? Guid.NewGuid(), "Burger", "Juicy", Guid.NewGuid(), "Mains", 9.99m, true, null, 1);

    // ── GET /api/menu/items ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetPaged_WhenAuthenticated_Returns200()
    {
        var paged = new PagedResult<MenuItemDto>(new[] { MakeItemDto() }, 1, 1, 12, 1);
        _serviceMock
            .Setup(s => s.GetPagedAsync(It.IsAny<MenuItemQueryParams>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<PagedResult<MenuItemDto>>.Success(paged));

        var response = await _factory.CreateClientWithRole("Waiter").GetAsync("/api/menu/items");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetPaged_WhenUnauthenticated_Returns401()
    {
        var response = await _factory.CreateClient().GetAsync("/api/menu/items");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetPaged_WithQueryParams_PassesParamsToService()
    {
        var categoryId = Guid.NewGuid();
        var paged = new PagedResult<MenuItemDto>(Array.Empty<MenuItemDto>(), 0, 1, 12, 0);
        _serviceMock
            .Setup(s => s.GetPagedAsync(
                It.Is<MenuItemQueryParams>(p => p.CategoryId == categoryId && p.Search == "burger"),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<PagedResult<MenuItemDto>>.Success(paged));

        var response = await _factory.CreateClientWithRole("Admin")
            .GetAsync($"/api/menu/items?categoryId={categoryId}&search=burger");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        _serviceMock.Verify(s => s.GetPagedAsync(
            It.Is<MenuItemQueryParams>(p => p.CategoryId == categoryId && p.Search == "burger"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    // ── GET /api/menu/items/{id} ─────────────────────────────────────────────────────

    [Fact]
    public async Task GetById_WhenFound_Returns200()
    {
        var id  = Guid.NewGuid();
        var dto = MakeItemDto(id);
        _serviceMock
            .Setup(s => s.GetByIdAsync(id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<MenuItemDto>.Success(dto));

        var response = await _factory.CreateClientWithRole("Waiter").GetAsync($"/api/menu/items/{id}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetById_WhenNotFound_Returns404()
    {
        var id = Guid.NewGuid();
        _serviceMock
            .Setup(s => s.GetByIdAsync(id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<MenuItemDto>.Failure(ResultError.NotFound, "Item not found."));

        var response = await _factory.CreateClientWithRole("Waiter").GetAsync($"/api/menu/items/{id}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── POST /api/menu/items (Admin only, multipart form) ────────────────────────────

    [Fact]
    public async Task Create_AsAdmin_WithoutImage_Returns200()
    {
        var created = MakeItemDto();
        _serviceMock
            .Setup(s => s.CreateAsync(
                It.IsAny<CreateMenuItemRequest>(),
                It.IsAny<Stream?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<Guid>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<MenuItemDto>.Success(created));

        var form = new MultipartFormDataContent
        {
            { new StringContent("Burger"),                          "Name" },
            { new StringContent("Juicy beef burger"),               "Description" },
            { new StringContent("9.99"),                            "Price" },
            { new StringContent(Guid.NewGuid().ToString()),         "CategoryId" },
            { new StringContent("true"),                            "IsAvailable" },
            { new StringContent("1"),                               "DisplayOrder" },
        };

        var response = await _factory.CreateClientWithRole("Admin")
            .PostAsync("/api/menu/items", form);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Create_AsWaiter_Returns403()
    {
        var form = new MultipartFormDataContent
        {
            { new StringContent("Burger"),                  "Name" },
            { new StringContent("9.99"),                    "Price" },
            { new StringContent(Guid.NewGuid().ToString()), "CategoryId" },
            { new StringContent("true"),                    "IsAvailable" },
            { new StringContent("1"),                       "DisplayOrder" },
        };

        var response = await _factory.CreateClientWithRole("Waiter")
            .PostAsync("/api/menu/items", form);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── PUT /api/menu/items/{id} (Admin only, multipart form) ────────────────────────

    [Fact]
    public async Task Update_AsAdmin_Returns200()
    {
        var id      = Guid.NewGuid();
        var updated = MakeItemDto(id);
        _serviceMock
            .Setup(s => s.UpdateAsync(
                id,
                It.IsAny<UpdateMenuItemRequest>(),
                It.IsAny<Stream?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<Guid>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<MenuItemDto>.Success(updated));

        var form = new MultipartFormDataContent
        {
            { new StringContent("Burger Updated"),                  "Name" },
            { new StringContent("10.99"),                           "Price" },
            { new StringContent(Guid.NewGuid().ToString()),         "CategoryId" },
            { new StringContent("true"),                            "IsAvailable" },
            { new StringContent("1"),                               "DisplayOrder" },
        };

        var response = await _factory.CreateClientWithRole("Admin")
            .PutAsync($"/api/menu/items/{id}", form);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ── DELETE /api/menu/items/{id} (Admin only) ─────────────────────────────────────

    [Fact]
    public async Task Delete_AsAdmin_Returns200()
    {
        var id = Guid.NewGuid();
        _serviceMock
            .Setup(s => s.DeleteAsync(id, It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<bool>.Success(true));

        var response = await _factory.CreateClientWithRole("Admin")
            .DeleteAsync($"/api/menu/items/{id}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Delete_AsWaiter_Returns403()
    {
        var response = await _factory.CreateClientWithRole("Waiter")
            .DeleteAsync($"/api/menu/items/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── PATCH /api/menu/items/{id}/availability (Admin or Manager) ───────────────────

    [Fact]
    public async Task ToggleAvailability_AsManager_Returns200()
    {
        var id  = Guid.NewGuid();
        var dto = MakeItemDto(id);
        _serviceMock
            .Setup(s => s.ToggleAvailabilityAsync(id, It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<MenuItemDto>.Success(dto));

        var response = await _factory.CreateClientWithRole("Manager")
            .PatchAsync($"/api/menu/items/{id}/availability", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ToggleAvailability_AsWaiter_Returns403()
    {
        var response = await _factory.CreateClientWithRole("Waiter")
            .PatchAsync($"/api/menu/items/{Guid.NewGuid()}/availability", null);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
