using DineFlow.Application.DTOs.Menu;
using DineFlow.Domain.Common;
using DineFlow.Domain.Entities;
using DineFlow.Domain.Interfaces;
using FluentValidation;

namespace DineFlow.Application.Services;

public class MenuCategoryService : IMenuCategoryService
{
    private readonly IMenuCategoryRepository _categories;
    private readonly IValidator<CreateMenuCategoryRequest> _createVal;
    private readonly IValidator<UpdateMenuCategoryRequest> _updateVal;

    public MenuCategoryService(
        IMenuCategoryRepository categories,
        IValidator<CreateMenuCategoryRequest> createVal,
        IValidator<UpdateMenuCategoryRequest> updateVal)
    {
        _categories = categories;
        _createVal = createVal;
        _updateVal = updateVal;
    }

    public async Task<Result<IReadOnlyList<MenuCategoryDto>>> GetAllAsync(CancellationToken ct = default)
    {
        var cats = await _categories.GetAllAsync(ct);
        var dtos = cats.Select(c => new MenuCategoryDto(c.Id, c.Name, c.SortOrder, c.IsActive, c.Items.Count)).ToList();
        return Result<IReadOnlyList<MenuCategoryDto>>.Success(dtos);
    }

    public async Task<Result<MenuCategoryDto>> CreateAsync(CreateMenuCategoryRequest request, Guid performedBy, CancellationToken ct = default)
    {
        var v = await _createVal.ValidateAsync(request, ct);
        if (!v.IsValid)
            return Result<MenuCategoryDto>.Failure(ResultError.Validation, string.Join("; ", v.Errors.Select(e => e.ErrorMessage)));

        var cat = new MenuCategory
        {
            Name = request.Name,
            SortOrder = request.SortOrder,
            IsActive = request.IsActive,
            CreatedBy = performedBy.ToString()
        };

        await _categories.AddAsync(cat, ct);
        await _categories.SaveChangesAsync(ct);
        return Result<MenuCategoryDto>.Success(new MenuCategoryDto(cat.Id, cat.Name, cat.SortOrder, cat.IsActive, 0));
    }

    public async Task<Result<MenuCategoryDto>> UpdateAsync(Guid id, UpdateMenuCategoryRequest request, Guid performedBy, CancellationToken ct = default)
    {
        var v = await _updateVal.ValidateAsync(request, ct);
        if (!v.IsValid)
            return Result<MenuCategoryDto>.Failure(ResultError.Validation, string.Join("; ", v.Errors.Select(e => e.ErrorMessage)));

        var cat = await _categories.GetByIdAsync(id, ct);
        if (cat is null)
            return Result<MenuCategoryDto>.Failure(ResultError.NotFound, "Category not found.");

        cat.Name = request.Name;
        cat.SortOrder = request.SortOrder;
        cat.IsActive = request.IsActive;
        cat.UpdatedBy = performedBy.ToString();

        await _categories.SaveChangesAsync(ct);
        return Result<MenuCategoryDto>.Success(new MenuCategoryDto(cat.Id, cat.Name, cat.SortOrder, cat.IsActive, cat.Items.Count));
    }

    public async Task<Result<bool>> DeleteAsync(Guid id, Guid performedBy, CancellationToken ct = default)
    {
        var cat = await _categories.GetByIdAsync(id, ct);
        if (cat is null)
            return Result<bool>.Failure(ResultError.NotFound, "Category not found.");

        cat.IsDeleted = true;
        cat.UpdatedBy = performedBy.ToString();
        await _categories.SaveChangesAsync(ct);
        return Result<bool>.Success(true);
    }
}
