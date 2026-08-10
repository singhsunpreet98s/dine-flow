using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using DineFlow.API.Hubs;
using DineFlow.Application.Services;
using DineFlow.Domain.Interfaces;
using DineFlow.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.IdentityModel.Tokens;
using Moq;

namespace DineFlow.Tests.Controllers.Helpers;

/// <summary>
/// Shared WebApplicationFactory for all controller integration tests.
/// Replaces SQL Server with InMemory and all service interfaces with Moq mocks so tests
/// are fast, isolated, and do not require a live database or external services.
///
/// Usage pattern (xUnit):
///   public class MyControllerTests : IClassFixture&lt;DineFlowWebApplicationFactory&gt;
///   {
///       private readonly Mock&lt;IXxxService&gt; _mock;
///       public MyControllerTests(DineFlowWebApplicationFactory factory) {
///           _mock = factory.XxxServiceMock;
///           _mock.Reset();          // isolate from prior tests in this class
///       }
///   }
/// </summary>
public class DineFlowWebApplicationFactory : WebApplicationFactory<Program>
{
    // ── JWT settings used for both token generation and app configuration ──────────────
    public const string TestJwtSecret = "test-jwt-secret-that-is-long-enough-for-hmacsha256-algorithm";
    public const string TestIssuer    = "test-issuer";
    public const string TestAudience  = "test-audience";

    // ── Exposed mocks — test classes reset and configure them per test ────────────────
    public Mock<IAuthService>          AuthServiceMock          { get; } = new();
    public Mock<IMenuCategoryService>  MenuCategoryServiceMock  { get; } = new();
    public Mock<IMenuItemService>      MenuItemServiceMock      { get; } = new();
    public Mock<IFloorService>         FloorServiceMock         { get; } = new();
    public Mock<IOrderService>         OrderServiceMock         { get; } = new();
    public Mock<ISettingsService>      SettingsServiceMock      { get; } = new();
    public Mock<IDashboardService>     DashboardServiceMock     { get; } = new();
    public Mock<IBlobStorageService>   BlobStorageServiceMock   { get; } = new();

    // ─────────────────────────────────────────────────────────────────────────────────
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Override JWT config so test-generated tokens pass signature validation
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Secret"]   = TestJwtSecret,
                ["Jwt:Issuer"]   = TestIssuer,
                ["Jwt:Audience"] = TestAudience,
            });
        });

        builder.ConfigureServices(services =>
        {
            // Replace SQL Server DbContext with InMemory — no live DB needed
            services.RemoveAll<DbContextOptions<DineFlowDbContext>>();
            services.AddDbContext<DineFlowDbContext>(opts =>
                opts.UseInMemoryDatabase("ControllerTestsDb_" + Guid.NewGuid().ToString("N")));

            // ── Mock IHubContext<OrderHub> used directly by OrdersController ─────────
            var mockProxy = new Mock<IClientProxy>();
            mockProxy
                .Setup(p => p.SendCoreAsync(
                    It.IsAny<string>(),
                    It.IsAny<object?[]>(),
                    It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            var mockClients = new Mock<IHubClients>();
            mockClients.Setup(c => c.Group(It.IsAny<string>())).Returns(mockProxy.Object);
            mockClients.Setup(c => c.All).Returns(mockProxy.Object);

            var hubMock = new Mock<IHubContext<OrderHub>>();
            hubMock.Setup(h => h.Clients).Returns(mockClients.Object);

            // AddSingleton with explicit service type takes precedence over SignalR's
            // open-generic IHubContext<> registration
            services.AddSingleton<IHubContext<OrderHub>>(hubMock.Object);

            // ── Replace all application service interfaces with mocks ─────────────
            Replace(services, AuthServiceMock.Object);
            Replace(services, MenuCategoryServiceMock.Object);
            Replace(services, MenuItemServiceMock.Object);
            Replace(services, FloorServiceMock.Object);
            Replace(services, OrderServiceMock.Object);
            Replace(services, SettingsServiceMock.Object);
            Replace(services, DashboardServiceMock.Object);
            Replace(services, BlobStorageServiceMock.Object);
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────────

    /// <summary>Removes existing registrations for T and adds implementation as singleton.</summary>
    private static void Replace<T>(IServiceCollection services, T implementation) where T : class
    {
        services.RemoveAll<T>();
        services.AddSingleton(implementation);
    }

    /// <summary>Creates an HttpClient with an Authorization: Bearer header for the given role.</summary>
    public HttpClient CreateClientWithRole(string role, Guid? userId = null)
    {
        var client = CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", GenerateToken(userId ?? Guid.NewGuid(), role));
        return client;
    }

    private static string GenerateToken(Guid userId, string role)
    {
        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestJwtSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Role,           role),
            new Claim(ClaimTypes.Name,           $"Test {role}"),
        };
        var jwt = new JwtSecurityToken(
            issuer:            TestIssuer,
            audience:          TestAudience,
            claims:            claims,
            expires:           DateTime.UtcNow.AddHours(1),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(jwt);
    }
}
