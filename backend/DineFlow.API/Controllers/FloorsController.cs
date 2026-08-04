using DineFlow.API.Extensions;
using DineFlow.Application.DTOs.Floor;
using DineFlow.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DineFlow.API.Controllers;

[ApiController]
[Route("api/floors")]
[Authorize]
public class FloorsController : ControllerBase
{
    private readonly IFloorService _service;

    public FloorsController(IFloorService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
        => (await _service.GetAllFloorsAsync(ct)).ToHttpResult(this);

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateFloorRequest request, CancellationToken ct)
        => (await _service.CreateFloorAsync(request, User.GetUserId(), ct)).ToHttpResult(this);

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateFloorRequest request, CancellationToken ct)
        => (await _service.UpdateFloorAsync(id, request, User.GetUserId(), ct)).ToHttpResult(this);

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        => (await _service.DeleteFloorAsync(id, User.GetUserId(), ct)).ToHttpResult(this);

    [HttpPost("{floorId:guid}/tables")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateTable(Guid floorId, [FromBody] CreateTableRequest request, CancellationToken ct)
    {
        request.FloorId = floorId;
        return (await _service.CreateTableAsync(request, User.GetUserId(), ct)).ToHttpResult(this);
    }

    [HttpPut("tables/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateTable(Guid id, [FromBody] UpdateTableRequest request, CancellationToken ct)
        => (await _service.UpdateTableAsync(id, request, User.GetUserId(), ct)).ToHttpResult(this);

    [HttpDelete("tables/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteTable(Guid id, CancellationToken ct)
        => (await _service.DeleteTableAsync(id, User.GetUserId(), ct)).ToHttpResult(this);

    [HttpPut("{floorId:guid}/layout")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> SaveLayout(Guid floorId, [FromBody] SaveLayoutRequest request, CancellationToken ct)
        => (await _service.SaveLayoutAsync(floorId, request, User.GetUserId(), ct)).ToHttpResult(this);

    [HttpGet("live")]
    public async Task<IActionResult> GetLive(CancellationToken ct)
        => (await _service.GetLiveFloorsAsync(ct)).ToHttpResult(this);
}
