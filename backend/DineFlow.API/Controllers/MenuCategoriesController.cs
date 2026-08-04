using DineFlow.API.Extensions;
using DineFlow.Application.DTOs.Menu;
using DineFlow.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DineFlow.API.Controllers;

[ApiController]
[Route("api/menu/categories")]
[Authorize]
public class MenuCategoriesController : ControllerBase
{
    private readonly IMenuCategoryService _service;

    public MenuCategoriesController(IMenuCategoryService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
        => (await _service.GetAllAsync(ct)).ToHttpResult(this);

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateMenuCategoryRequest request, CancellationToken ct)
        => (await _service.CreateAsync(request, User.GetUserId(), ct)).ToHttpResult(this);

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateMenuCategoryRequest request, CancellationToken ct)
        => (await _service.UpdateAsync(id, request, User.GetUserId(), ct)).ToHttpResult(this);

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        => (await _service.DeleteAsync(id, User.GetUserId(), ct)).ToHttpResult(this);
}
