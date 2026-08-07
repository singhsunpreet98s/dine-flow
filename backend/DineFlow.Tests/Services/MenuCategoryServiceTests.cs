using DineFlow.Application.DTOs.Menu;
using DineFlow.Application.Services;
using DineFlow.Domain.Common;
using DineFlow.Domain.Entities;
using DineFlow.Domain.Interfaces;
using FluentAssertions;
using FluentValidation;
using FluentValidation.Results;
using Moq;
using Xunit;

namespace DineFlow.Tests.Services;

public class MenuCategoryServiceTests
{
    private readonly Mock<IMenuCategoryRepository> _categories;
    private readonly Mock<IValidator<CreateMenuCategoryRequest>> _createVal;
    private readonly Mock<IValidator<UpdateMenuCategoryRequest>> _updateVal;
    private readonly MenuCategoryService _sut;
    private readonly Guid _performedBy = Guid.NewGuid();

    public MenuCategoryServiceTests()
    {
        _categories = new Mock<IMenuCategoryRepository>();
        _createVal  = new Mock<IValidator<CreateMenuCategoryRequest>>();
        _updateVal  = new Mock<IValidator<UpdateMenuCategoryRequest>>();

        _sut = new MenuCategoryService(
            _categories.Object,
            _createVal.Object,
            _updateVal.Object);
    }

    // ─── helpers ────────────────────────────────────────────────────────────

    private static MenuCategory MakeCategory(string name = "Starters", int sortOrder = 1, bool isActive = true)
        => new() { Name = name, SortOrder = sortOrder, IsActive = isActive };

    private void SetupCreateValidationPass()
        => _createVal
            .Setup(v => v.ValidateAsync(It.IsAny<CreateMenuCategoryRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult());

    private void SetupCreateValidationFail()
        => _createVal
            .Setup(v => v.ValidateAsync(It.IsAny<CreateMenuCategoryRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult(new List<ValidationFailure> { new("Name", "error") }));

    private void SetupUpdateValidationPass()
        => _updateVal
            .Setup(v => v.ValidateAsync(It.IsAny<UpdateMenuCategoryRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult());

    private void SetupUpdateValidationFail()
        => _updateVal
            .Setup(v => v.ValidateAsync(It.IsAny<UpdateMenuCategoryRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult(new List<ValidationFailure> { new("Name", "error") }));

    // ─── GetAllAsync ─────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAllAsync_WhenCategoriesExist_ReturnsMappedDtos()
    {
        // Arrange
        var cat1 = MakeCategory("Starters");
        // cat1 has no items — ItemCount should be 0

        var cat2 = MakeCategory("Mains");
        cat2.Items.Add(new MenuItem { Name = "Burger" });
        cat2.Items.Add(new MenuItem { Name = "Pasta" });
        cat2.Items.Add(new MenuItem { Name = "Pizza" });

        _categories
            .Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<MenuCategory> { cat1, cat2 });

        // Act
        var result = await _sut.GetAllAsync();

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().HaveCount(2);

        var dto1 = result.Value!.First(d => d.Name == "Starters");
        dto1.ItemCount.Should().Be(0);

        var dto2 = result.Value!.First(d => d.Name == "Mains");
        dto2.ItemCount.Should().Be(3);
    }

    [Fact]
    public async Task GetAllAsync_WhenNoCategoriesExist_ReturnsEmptyList()
    {
        // Arrange
        _categories
            .Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<MenuCategory>());

        // Act
        var result = await _sut.GetAllAsync();

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().BeEmpty();
    }

    // ─── CreateAsync ─────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_WhenValidationFails_ReturnsValidationFailure()
    {
        // Arrange
        SetupCreateValidationFail();
        var request = new CreateMenuCategoryRequest("", 0, true);

        // Act
        var result = await _sut.CreateAsync(request, _performedBy);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorType.Should().Be(ResultError.Validation);
    }

    [Fact]
    public async Task CreateAsync_HappyPath_CallsAddAsyncAndSave()
    {
        // Arrange
        SetupCreateValidationPass();
        _categories.Setup(r => r.AddAsync(It.IsAny<MenuCategory>(), It.IsAny<CancellationToken>()))
                   .Returns(Task.CompletedTask);
        _categories.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                   .ReturnsAsync(1);

        var request = new CreateMenuCategoryRequest("Desserts", 3, true);

        // Act
        var result = await _sut.CreateAsync(request, _performedBy);

        // Assert
        result.IsSuccess.Should().BeTrue();
        _categories.Verify(r => r.AddAsync(It.IsAny<MenuCategory>(), It.IsAny<CancellationToken>()), Times.Once);
        _categories.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_HappyPath_ReturnsDtoWithCorrectFields()
    {
        // Arrange
        SetupCreateValidationPass();
        _categories.Setup(r => r.AddAsync(It.IsAny<MenuCategory>(), It.IsAny<CancellationToken>()))
                   .Returns(Task.CompletedTask);
        _categories.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                   .ReturnsAsync(1);

        var request = new CreateMenuCategoryRequest("Beverages", 5, false);

        // Act
        var result = await _sut.CreateAsync(request, _performedBy);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Name.Should().Be("Beverages");
        result.Value.SortOrder.Should().Be(5);
        result.Value.IsActive.Should().BeFalse();
        result.Value.ItemCount.Should().Be(0);
    }

    // ─── UpdateAsync ─────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateAsync_WhenValidationFails_ReturnsValidationFailure()
    {
        // Arrange
        SetupUpdateValidationFail();
        var request = new UpdateMenuCategoryRequest("", 0, true);

        // Act
        var result = await _sut.UpdateAsync(Guid.NewGuid(), request, _performedBy);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorType.Should().Be(ResultError.Validation);
    }

    [Fact]
    public async Task UpdateAsync_WhenCategoryNotFound_ReturnsNotFound()
    {
        // Arrange
        SetupUpdateValidationPass();
        _categories
            .Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MenuCategory?)null);

        var request = new UpdateMenuCategoryRequest("New Name", 2, true);

        // Act
        var result = await _sut.UpdateAsync(Guid.NewGuid(), request, _performedBy);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorType.Should().Be(ResultError.NotFound);
    }

    [Fact]
    public async Task UpdateAsync_HappyPath_UpdatesFieldsAndSaves()
    {
        // Arrange
        SetupUpdateValidationPass();

        var existing = MakeCategory("Old Name", sortOrder: 1, isActive: true);
        _categories
            .Setup(r => r.GetByIdAsync(existing.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        _categories.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                   .ReturnsAsync(1);

        var request = new UpdateMenuCategoryRequest("New Name", 10, false);

        // Act
        var result = await _sut.UpdateAsync(existing.Id, request, _performedBy);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Name.Should().Be("New Name");
        result.Value.SortOrder.Should().Be(10);
        result.Value.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task UpdateAsync_HappyPath_SaveChangesCalledOnce()
    {
        // Arrange
        SetupUpdateValidationPass();

        var existing = MakeCategory("Starters");
        _categories
            .Setup(r => r.GetByIdAsync(existing.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        _categories.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                   .ReturnsAsync(1);

        var request = new UpdateMenuCategoryRequest("Starters Updated", 2, true);

        // Act
        await _sut.UpdateAsync(existing.Id, request, _performedBy);

        // Assert
        _categories.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    // ─── DeleteAsync ─────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteAsync_WhenCategoryNotFound_ReturnsNotFound()
    {
        // Arrange
        _categories
            .Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MenuCategory?)null);

        // Act
        var result = await _sut.DeleteAsync(Guid.NewGuid(), _performedBy);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorType.Should().Be(ResultError.NotFound);
    }

    [Fact]
    public async Task DeleteAsync_HappyPath_SetsIsDeletedTrue()
    {
        // Arrange
        var existing = MakeCategory("Soups");
        existing.IsDeleted.Should().BeFalse(); // precondition

        _categories
            .Setup(r => r.GetByIdAsync(existing.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        _categories.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                   .ReturnsAsync(1);

        // Act
        await _sut.DeleteAsync(existing.Id, _performedBy);

        // Assert — the entity mutated in-place; the repo would persist this change
        existing.IsDeleted.Should().BeTrue();
    }

    [Fact]
    public async Task DeleteAsync_HappyPath_ReturnsSuccessTrue()
    {
        // Arrange
        var existing = MakeCategory("Soups");
        _categories
            .Setup(r => r.GetByIdAsync(existing.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        _categories.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                   .ReturnsAsync(1);

        // Act
        var result = await _sut.DeleteAsync(existing.Id, _performedBy);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().BeTrue();
    }
}
