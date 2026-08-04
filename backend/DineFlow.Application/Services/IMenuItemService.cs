using DineFlow.Application.DTOs.Menu;
using DineFlow.Domain.Common;

namespace DineFlow.Application.Services;

public interface IMenuItemService
{
    Task<Result<PagedResult<MenuItemDto>>> GetPagedAsync(MenuItemQueryParams query, CancellationToken ct = default);
    Task<Result<MenuItemDto>> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Result<MenuItemDto>> CreateAsync(CreateMenuItemRequest request, Stream? imageStream, string? imageName, string? imageContentType, Guid performedBy, CancellationToken ct = default);
    Task<Result<MenuItemDto>> UpdateAsync(Guid id, UpdateMenuItemRequest request, Stream? imageStream, string? imageName, string? imageContentType, Guid performedBy, CancellationToken ct = default);
    Task<Result<bool>> DeleteAsync(Guid id, Guid performedBy, CancellationToken ct = default);
    Task<Result<MenuItemDto>> ToggleAvailabilityAsync(Guid id, Guid performedBy, CancellationToken ct = default);
}
