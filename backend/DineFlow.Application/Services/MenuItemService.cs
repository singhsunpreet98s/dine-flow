using DineFlow.Application.DTOs.Menu;
using DineFlow.Domain.Common;
using DineFlow.Domain.Entities;
using DineFlow.Domain.Interfaces;
using FluentValidation;

namespace DineFlow.Application.Services;

public class MenuItemService : IMenuItemService
{
    private readonly IMenuItemRepository _items;
    private readonly IMenuCategoryRepository _categories;
    private readonly IBlobStorageService _blob;
    private readonly IValidator<CreateMenuItemRequest> _createVal;
    private readonly IValidator<UpdateMenuItemRequest> _updateVal;

    public MenuItemService(
        IMenuItemRepository items,
        IMenuCategoryRepository categories,
        IBlobStorageService blob,
        IValidator<CreateMenuItemRequest> createVal,
        IValidator<UpdateMenuItemRequest> updateVal)
    {
        _items = items;
        _categories = categories;
        _blob = blob;
        _createVal = createVal;
        _updateVal = updateVal;
    }

    public async Task<Result<PagedResult<MenuItemDto>>> GetPagedAsync(MenuItemQueryParams query, CancellationToken ct = default)
    {
        var (items, total) = await _items.GetPagedAsync(query.CategoryId, query.Search, query.Page, query.PageSize, ct);
        var dtos = items.Select(MapToDto).ToList();
        var totalPages = (int)Math.Ceiling(total / (double)query.PageSize);
        return Result<PagedResult<MenuItemDto>>.Success(new PagedResult<MenuItemDto>(dtos, total, query.Page, query.PageSize, totalPages));
    }

    public async Task<Result<MenuItemDto>> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var item = await _items.GetByIdAsync(id, ct);
        if (item is null) return Result<MenuItemDto>.Failure(ResultError.NotFound, "Menu item not found.");
        return Result<MenuItemDto>.Success(MapToDto(item));
    }

    public async Task<Result<MenuItemDto>> CreateAsync(
        CreateMenuItemRequest request,
        Stream? imageStream,
        string? imageName,
        string? imageContentType,
        Guid performedBy,
        CancellationToken ct = default)
    {
        var v = await _createVal.ValidateAsync(request, ct);
        if (!v.IsValid)
            return Result<MenuItemDto>.Failure(ResultError.Validation, string.Join("; ", v.Errors.Select(e => e.ErrorMessage)));

        var category = await _categories.GetByIdAsync(request.CategoryId, ct);
        if (category is null)
            return Result<MenuItemDto>.Failure(ResultError.NotFound, "Category not found.");

        string? photoUrl = null;
        if (imageStream is not null && imageName is not null && imageContentType is not null)
            photoUrl = await _blob.UploadAsync(imageStream, imageName, imageContentType, ct);

        var item = new MenuItem
        {
            Name = request.Name,
            Description = request.Description,
            Price = request.Price,
            CategoryId = request.CategoryId,
            IsAvailable = request.IsAvailable,
            DisplayOrder = request.DisplayOrder,
            PhotoUrl = photoUrl,
            CreatedBy = performedBy.ToString()
        };

        await _items.AddAsync(item, ct);
        await _items.SaveChangesAsync(ct);

        item.Category = category;
        return Result<MenuItemDto>.Success(MapToDto(item));
    }

    public async Task<Result<MenuItemDto>> UpdateAsync(
        Guid id,
        UpdateMenuItemRequest request,
        Stream? imageStream,
        string? imageName,
        string? imageContentType,
        Guid performedBy,
        CancellationToken ct = default)
    {
        var v = await _updateVal.ValidateAsync(request, ct);
        if (!v.IsValid)
            return Result<MenuItemDto>.Failure(ResultError.Validation, string.Join("; ", v.Errors.Select(e => e.ErrorMessage)));

        var item = await _items.GetByIdAsync(id, ct);
        if (item is null) return Result<MenuItemDto>.Failure(ResultError.NotFound, "Menu item not found.");

        var category = await _categories.GetByIdAsync(request.CategoryId, ct);
        if (category is null)
            return Result<MenuItemDto>.Failure(ResultError.NotFound, "Category not found.");

        if (imageStream is not null && imageName is not null && imageContentType is not null)
        {
            if (!string.IsNullOrWhiteSpace(item.PhotoUrl))
                await _blob.DeleteAsync(item.PhotoUrl, ct);
            item.PhotoUrl = await _blob.UploadAsync(imageStream, imageName, imageContentType, ct);
        }

        item.Name = request.Name;
        item.Description = request.Description;
        item.Price = request.Price;
        item.CategoryId = request.CategoryId;
        item.IsAvailable = request.IsAvailable;
        item.DisplayOrder = request.DisplayOrder;
        item.UpdatedBy = performedBy.ToString();

        await _items.SaveChangesAsync(ct);
        item.Category = category;
        return Result<MenuItemDto>.Success(MapToDto(item));
    }

    public async Task<Result<bool>> DeleteAsync(Guid id, Guid performedBy, CancellationToken ct = default)
    {
        var item = await _items.GetByIdAsync(id, ct);
        if (item is null) return Result<bool>.Failure(ResultError.NotFound, "Menu item not found.");

        if (!string.IsNullOrWhiteSpace(item.PhotoUrl))
            await _blob.DeleteAsync(item.PhotoUrl, ct);

        item.IsDeleted = true;
        item.UpdatedBy = performedBy.ToString();
        await _items.SaveChangesAsync(ct);
        return Result<bool>.Success(true);
    }

    public async Task<Result<MenuItemDto>> ToggleAvailabilityAsync(Guid id, Guid performedBy, CancellationToken ct = default)
    {
        var item = await _items.GetByIdAsync(id, ct);
        if (item is null) return Result<MenuItemDto>.Failure(ResultError.NotFound, "Menu item not found.");

        item.IsAvailable = !item.IsAvailable;
        item.UpdatedBy = performedBy.ToString();
        await _items.SaveChangesAsync(ct);
        return Result<MenuItemDto>.Success(MapToDto(item));
    }

    private static MenuItemDto MapToDto(MenuItem m) =>
        new(m.Id, m.Name, m.Description, m.CategoryId, m.Category?.Name ?? string.Empty, m.Price, m.IsAvailable, m.PhotoUrl, m.DisplayOrder);
}
