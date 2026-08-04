using DineFlow.Application.DTOs.Menu;
using DineFlow.Domain.Common;

namespace DineFlow.Application.Services;

public interface IMenuCategoryService
{
    Task<Result<IReadOnlyList<MenuCategoryDto>>> GetAllAsync(CancellationToken ct = default);
    Task<Result<MenuCategoryDto>> CreateAsync(CreateMenuCategoryRequest request, Guid performedBy, CancellationToken ct = default);
    Task<Result<MenuCategoryDto>> UpdateAsync(Guid id, UpdateMenuCategoryRequest request, Guid performedBy, CancellationToken ct = default);
    Task<Result<bool>> DeleteAsync(Guid id, Guid performedBy, CancellationToken ct = default);
}
