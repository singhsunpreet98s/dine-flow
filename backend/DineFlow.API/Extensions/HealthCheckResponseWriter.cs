using System.Reflection;
using System.Text.Json;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace DineFlow.API.Extensions;

/// <summary>
/// Writes a structured JSON health check response that includes API version and UTC timestamp,
/// suitable for consumption by load balancers, Docker HEALTHCHECK, and Kubernetes probes.
/// </summary>
internal static class HealthCheckResponseWriter
{
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    internal static Task WriteAsync(HttpContext context, HealthReport report)
    {
        context.Response.ContentType = "application/json";

        var version = Assembly.GetExecutingAssembly()
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion
            ?? "unknown";

        var response = new
        {
            status    = report.Status.ToString(),
            version,
            timestamp = DateTime.UtcNow,
            duration  = report.TotalDuration,
            checks    = report.Entries.Select(e => new
            {
                name        = e.Key,
                status      = e.Value.Status.ToString(),
                duration    = e.Value.Duration,
                description = e.Value.Description
            })
        };

        return context.Response.WriteAsync(
            JsonSerializer.Serialize(response, SerializerOptions));
    }
}
