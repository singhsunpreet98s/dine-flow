using System.Net;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;

namespace DineFlow.Tests.Controllers;

/// <summary>
/// Integration tests for GET /health using WebApplicationFactory.
/// The real SQL Server health check is replaced with a controllable fake so
/// no live database connection is required.
/// </summary>
public class HealthCheckTests : IDisposable
{
    // Shared JSON options for deserialisation.
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    // -----------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------

    /// <summary>Creates a test factory whose /health endpoint returns the given status.</summary>
    private static WebApplicationFactory<Program> CreateFactory(HealthStatus status)
    {
        return new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Replace ALL health check registrations with a single fake that
                // returns the requested status — no real SQL Server needed.
                services.Configure<HealthCheckServiceOptions>(opts =>
                {
                    opts.Registrations.Clear();
                    opts.Registrations.Add(new HealthCheckRegistration(
                        name: "sql_server",
                        factory: _ => new FixedHealthCheck(status),
                        failureStatus: null,
                        tags: null));
                });
            });
        });
    }

    // -----------------------------------------------------------------
    // Tests
    // -----------------------------------------------------------------

    [Fact]
    public async Task GetHealth_WhenHealthy_Returns200WithHealthyStatus()
    {
        // Arrange
        using var factory = CreateFactory(HealthStatus.Healthy);
        var client = factory.CreateClient();

        // Act
        var response = await client.GetAsync("/health");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await ParseBodyAsync(response);
        body.GetProperty("status").GetString().Should().Be("Healthy");
    }

    [Fact]
    public async Task GetHealth_WhenUnhealthy_Returns503WithUnhealthyStatus()
    {
        // Arrange
        using var factory = CreateFactory(HealthStatus.Unhealthy);
        var client = factory.CreateClient();

        // Act
        var response = await client.GetAsync("/health");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);

        var body = await ParseBodyAsync(response);
        body.GetProperty("status").GetString().Should().Be("Unhealthy");
    }

    [Fact]
    public async Task GetHealth_ResponseContainsVersionAndTimestamp()
    {
        // Arrange
        using var factory = CreateFactory(HealthStatus.Healthy);
        var client = factory.CreateClient();

        // Act
        var response = await client.GetAsync("/health");
        var body = await ParseBodyAsync(response);

        // Assert — both required fields must be non-empty
        body.GetProperty("version").GetString().Should().NotBeNullOrWhiteSpace();
        body.GetProperty("timestamp").GetString().Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task GetHealth_ResponseIncludesSqlServerCheck()
    {
        // Arrange
        using var factory = CreateFactory(HealthStatus.Healthy);
        var client = factory.CreateClient();

        // Act
        var response = await client.GetAsync("/health");
        var body = await ParseBodyAsync(response);

        // Assert — "checks" array must contain an entry named "sql_server"
        var checks = body.GetProperty("checks");
        checks.ValueKind.Should().Be(JsonValueKind.Array);
        var names = checks.EnumerateArray()
            .Select(c => c.GetProperty("name").GetString())
            .ToList();
        names.Should().Contain("sql_server");
    }

    [Fact]
    public async Task GetHealth_IsUnauthenticated_NoAuthorizationHeaderRequired()
    {
        // Arrange — client sends NO Authorization header (the default)
        using var factory = CreateFactory(HealthStatus.Healthy);
        var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        // Act
        var response = await client.GetAsync("/health");

        // Assert — must NOT redirect to login or return 401/403
        response.StatusCode.Should().NotBe(HttpStatusCode.Unauthorized);
        response.StatusCode.Should().NotBe(HttpStatusCode.Forbidden);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // -----------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------

    private static async Task<JsonElement> ParseBodyAsync(HttpResponseMessage response)
    {
        var json = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(json).RootElement;
    }

    public void Dispose() { }

    // -----------------------------------------------------------------
    // Fake health check — returns a fixed status set at construction time
    // -----------------------------------------------------------------

    private sealed class FixedHealthCheck : IHealthCheck
    {
        private readonly HealthStatus _status;
        public FixedHealthCheck(HealthStatus status) => _status = status;

        public Task<HealthCheckResult> CheckHealthAsync(
            HealthCheckContext context,
            CancellationToken cancellationToken = default)
        {
            var result = _status switch
            {
                HealthStatus.Healthy   => HealthCheckResult.Healthy("Fake check — healthy"),
                HealthStatus.Degraded  => HealthCheckResult.Degraded("Fake check — degraded"),
                _                      => HealthCheckResult.Unhealthy("Fake check — unhealthy")
            };
            return Task.FromResult(result);
        }
    }
}
