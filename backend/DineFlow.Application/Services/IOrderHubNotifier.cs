namespace DineFlow.Application.Services;

/// <summary>
/// Abstraction over SignalR so Application services can broadcast hub events
/// without taking a direct dependency on DineFlow.API (which would create a
/// circular project reference).  The concrete implementation lives in DineFlow.API.
/// </summary>
public interface IOrderHubNotifier
{
    Task SendToGroupAsync(string group, string method, object payload, CancellationToken ct = default);
}
