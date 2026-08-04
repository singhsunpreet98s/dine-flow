using DineFlow.API.Extensions;
using DineFlow.Application.DTOs.Menu;
using DineFlow.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DineFlow.API.Controllers;

[ApiController]
[Route("api/menu/items")]
[Authorize]
public class MenuItemsController : ControllerBase
{
    private readonly IMenuItemService _service;

    public MenuItemsController(IMenuItemService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetPaged(
        [FromQuery] Guid? categoryId,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken ct = default)
        => (await _service.GetPagedAsync(new MenuItemQueryParams(categoryId, search, page, pageSize), ct)).ToHttpResult(this);

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
        => (await _service.GetByIdAsync(id, ct)).ToHttpResult(this);

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromForm] CreateMenuItemRequest request, IFormFile? image, CancellationToken ct)
        => (await _service.CreateAsync(
            request,
            image?.OpenReadStream(),
            image?.FileName,
            image?.ContentType,
            User.GetUserId(),
            ct)).ToHttpResult(this);

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromForm] UpdateMenuItemRequest request, IFormFile? image, CancellationToken ct)
        => (await _service.UpdateAsync(
            id,
            request,
            image?.OpenReadStream(),
            image?.FileName,
            image?.ContentType,
            User.GetUserId(),
            ct)).ToHttpResult(this);

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        => (await _service.DeleteAsync(id, User.GetUserId(), ct)).ToHttpResult(this);

    [HttpPatch("{id:guid}/availability")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> ToggleAvailability(Guid id, CancellationToken ct)
        => (await _service.ToggleAvailabilityAsync(id, User.GetUserId(), ct)).ToHttpResult(this);
}
