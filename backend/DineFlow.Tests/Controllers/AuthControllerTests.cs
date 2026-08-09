using System.Net;
using System.Net.Http.Json;
using DineFlow.Application.DTOs;
using DineFlow.Application.DTOs.Auth;
using DineFlow.Application.Services;
using DineFlow.Domain.Common;
using DineFlow.Domain.Enums;
using DineFlow.Tests.Controllers.Helpers;
using FluentAssertions;
using Moq;

namespace DineFlow.Tests.Controllers;

public class AuthControllerTests : IClassFixture<DineFlowWebApplicationFactory>
{
    private readonly DineFlowWebApplicationFactory _factory;
    private readonly Mock<IAuthService> _authMock;

    public AuthControllerTests(DineFlowWebApplicationFactory factory)
    {
        _factory  = factory;
        _authMock = factory.AuthServiceMock;
        _authMock.Reset();
    }

    // ── POST /api/auth/register ──────────────────────────────────────────────────────

    [Fact]
    public async Task Register_WithValidRequest_Returns200()
    {
        var response = new AuthResponse("token", Guid.NewGuid(), "Alice", UserRole.Admin, false, "UTC");
        _authMock
            .Setup(s => s.RegisterAsync(It.IsAny<RegisterRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AuthResponse>.Success(response));

        var result = await _factory.CreateClient()
            .PostAsJsonAsync("/api/auth/register", new RegisterRequest("Alice", "alice@test.com", "Pass1!"));

        result.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Register_WhenEmailAlreadyTaken_Returns409()
    {
        _authMock
            .Setup(s => s.RegisterAsync(It.IsAny<RegisterRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AuthResponse>.Failure(ResultError.Conflict, "Email already registered."));

        var result = await _factory.CreateClient()
            .PostAsJsonAsync("/api/auth/register", new RegisterRequest("Alice", "alice@test.com", "Pass1!"));

        result.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Register_WhenValidationFails_Returns400()
    {
        _authMock
            .Setup(s => s.RegisterAsync(It.IsAny<RegisterRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AuthResponse>.Failure(ResultError.Validation, "Password too weak."));

        var result = await _factory.CreateClient()
            .PostAsJsonAsync("/api/auth/register", new RegisterRequest("A", "bad", "x"));

        result.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ── POST /api/auth/login ─────────────────────────────────────────────────────────

    [Fact]
    public async Task Login_WithValidCredentials_Returns200()
    {
        var response = new AuthResponse("token", Guid.NewGuid(), "Alice", UserRole.Admin, true, "UTC");
        _authMock
            .Setup(s => s.LoginAsync(It.IsAny<LoginRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AuthResponse>.Success(response));

        var result = await _factory.CreateClient()
            .PostAsJsonAsync("/api/auth/login", new LoginRequest("alice@test.com", "Pass1!"));

        result.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Login_WithWrongCredentials_Returns404()
    {
        _authMock
            .Setup(s => s.LoginAsync(It.IsAny<LoginRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AuthResponse>.Failure(ResultError.NotFound, "User not found."));

        var result = await _factory.CreateClient()
            .PostAsJsonAsync("/api/auth/login", new LoginRequest("nobody@test.com", "wrong"));

        result.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── POST /api/auth/users (Admin only) ────────────────────────────────────────────

    [Fact]
    public async Task CreateSubUser_AsAdmin_Returns200()
    {
        var dto = new AppUserDto(Guid.NewGuid(), "Bob", "bob@test.com", UserRole.Waiter, true, "UTC");
        _authMock
            .Setup(s => s.CreateSubUserAsync(It.IsAny<CreateSubUserRequest>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AppUserDto>.Success(dto));

        var result = await _factory.CreateClientWithRole("Admin")
            .PostAsJsonAsync("/api/auth/users", new CreateSubUserRequest("Bob", "bob@test.com", "Pass1!", UserRole.Waiter));

        result.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task CreateSubUser_WithoutAuth_Returns401()
    {
        var result = await _factory.CreateClient()
            .PostAsJsonAsync("/api/auth/users", new CreateSubUserRequest("Bob", "bob@test.com", "Pass1!", UserRole.Waiter));

        result.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task CreateSubUser_AsWaiter_Returns403()
    {
        var result = await _factory.CreateClientWithRole("Waiter")
            .PostAsJsonAsync("/api/auth/users", new CreateSubUserRequest("Bob", "bob@test.com", "Pass1!", UserRole.Waiter));

        result.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── PATCH /api/auth/restaurant-name (Admin only) ─────────────────────────────────

    [Fact]
    public async Task SetRestaurantName_AsAdmin_Returns200()
    {
        _authMock
            .Setup(s => s.SetRestaurantNameAsync(It.IsAny<SetRestaurantNameRequest>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<bool>.Success(true));

        var result = await _factory.CreateClientWithRole("Admin")
            .PatchAsJsonAsync("/api/auth/restaurant-name", new SetRestaurantNameRequest("The Palace"));

        result.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task SetRestaurantName_AsManager_Returns403()
    {
        var result = await _factory.CreateClientWithRole("Manager")
            .PatchAsJsonAsync("/api/auth/restaurant-name", new SetRestaurantNameRequest("The Palace"));

        result.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── GET /api/auth/users (Admin only) ─────────────────────────────────────────────

    [Fact]
    public async Task GetUsers_AsAdmin_Returns200WithList()
    {
        IReadOnlyList<AppUserDto> users = new[]
        {
            new AppUserDto(Guid.NewGuid(), "Alice", "alice@test.com", UserRole.Admin, true, "UTC"),
        };
        _authMock
            .Setup(s => s.GetAllUsersAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<IReadOnlyList<AppUserDto>>.Success(users));

        var result = await _factory.CreateClientWithRole("Admin").GetAsync("/api/auth/users");

        result.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetUsers_AsWaiter_Returns403()
    {
        var result = await _factory.CreateClientWithRole("Waiter").GetAsync("/api/auth/users");

        result.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── PATCH /api/auth/me/timezone (any authenticated user) ─────────────────────────

    [Fact]
    public async Task UpdateTimezone_WhenAuthenticated_Returns200()
    {
        var response = new AuthResponse("token", Guid.NewGuid(), "Alice", UserRole.Admin, true, "Asia/Kolkata");
        _authMock
            .Setup(s => s.UpdateTimezoneAsync(It.IsAny<UpdateTimezoneRequest>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AuthResponse>.Success(response));

        var result = await _factory.CreateClientWithRole("Admin")
            .PatchAsJsonAsync("/api/auth/me/timezone", new UpdateTimezoneRequest("Asia/Kolkata"));

        result.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task UpdateTimezone_WhenUnauthenticated_Returns401()
    {
        var result = await _factory.CreateClient()
            .PatchAsJsonAsync("/api/auth/me/timezone", new UpdateTimezoneRequest("Asia/Kolkata"));

        result.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
