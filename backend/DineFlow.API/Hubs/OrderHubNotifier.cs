using DineFlow.Application.Services;
using Microsoft.AspNetCore.SignalR;

namespace DineFlow.API.Hubs;

public class OrderHubNotifier : IOrderHubNotifier
{
    private readonly IHubContext<OrderHub> _hubContext;

    public OrderHubNotifier(IHubContext<OrderHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public Task SendToGroupAsync(string group, string method, object payload, CancellationToken ct = default)
        => _hubContext.Clients.Group(group).SendAsync(method, payload, ct);
}
