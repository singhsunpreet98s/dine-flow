using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace DineFlow.API.Hubs;

[Authorize]
public class OrderHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier;
        var role = Context.User?.FindFirst(ClaimTypes.Role)?.Value;

        if (userId != null)
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user-{userId}");

        await Groups.AddToGroupAsync(Context.ConnectionId, "all-users");

        // Admin gets manager-level events (same broadcast group)
        var roleGroup = role switch
        {
            "Kitchen" => "kitchen",
            "Manager" or "Admin" => "manager",
            _ => null
        };

        if (roleGroup != null)
            await Groups.AddToGroupAsync(Context.ConnectionId, roleGroup);

        await base.OnConnectedAsync();
    }
}
