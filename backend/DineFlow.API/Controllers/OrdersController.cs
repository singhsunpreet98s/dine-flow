using DineFlow.API.Extensions;
using DineFlow.API.Hubs;
using DineFlow.Application.DTOs.Orders;
using DineFlow.Application.Services;
using DineFlow.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using static DineFlow.Domain.Enums.TableStatus;

namespace DineFlow.API.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _service;
    private readonly IFloorService _floors;
    private readonly IHubContext<OrderHub> _hubContext;

    public OrdersController(IOrderService service, IFloorService floors, IHubContext<OrderHub> hubContext)
    {
        _service = service;
        _floors = floors;
        _hubContext = hubContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetActive(CancellationToken ct)
        => (await _service.GetActiveOrdersAsync(User.GetUserId(), GetCallerRole(), ct)).ToHttpResult(this);

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
        => (await _service.GetByIdAsync(id, ct)).ToHttpResult(this);

    [HttpPost]
    [Authorize(Roles = "Admin,Manager,Waiter")]
    public async Task<IActionResult> Create([FromBody] CreateOrderRequest request, CancellationToken ct)
    {
        var result = await _service.CreateOrderAsync(request, User.GetUserId(), ct);
        if (result.IsSuccess && request.RestaurantTableId.HasValue)
        {
            await _floors.SetTableStatusAsync(request.RestaurantTableId.Value, Occupied, ct);
            await _hubContext.Clients.Group("all-users").SendAsync(
                "TableStatusChanged",
                new { tableId = request.RestaurantTableId.Value, status = "Occupied", orderId = result.Value!.Id },
                ct);
        }
        return result.ToHttpResult(this);
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = "Admin,Manager,Waiter,Kitchen")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateOrderStatusRequest request, CancellationToken ct)
    {
        var result = await _service.UpdateOrderStatusAsync(id, request, User.GetUserId(), ct);
        if (result.IsSuccess
            && (request.Status == OrderStatus.Paid || request.Status == OrderStatus.Closed)
            && result.Value!.RestaurantTableId.HasValue)
        {
            await _floors.SetTableStatusAsync(result.Value.RestaurantTableId.Value, Available, ct);
            await _hubContext.Clients.Group("all-users").SendAsync(
                "TableStatusChanged",
                new { tableId = result.Value.RestaurantTableId.Value, status = "Available", orderId = (Guid?)null },
                ct);
        }
        return result.ToHttpResult(this);
    }

    [HttpPatch("{id:guid}/items")]
    [Authorize(Roles = "Admin,Manager,Waiter")]
    public async Task<IActionResult> AddItems(Guid id, [FromBody] AddItemsRequest request, CancellationToken ct)
        => (await _service.AddItemsAsync(id, request, User.GetUserId(), ct)).ToHttpResult(this);

    [HttpPatch("{id:guid}/assign-waiter")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AssignWaiter(Guid id, [FromBody] AssignWaiterRequest request, CancellationToken ct)
        => (await _service.AssignWaiterAsync(id, request.WaiterId, User.GetUserId(), ct)).ToHttpResult(this);

    private UserRole GetCallerRole()
    {
        var roleStr = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? string.Empty;
        return Enum.TryParse<UserRole>(roleStr, out var r) ? r : UserRole.Waiter;
    }
}
