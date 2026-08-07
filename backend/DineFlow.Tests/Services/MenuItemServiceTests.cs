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

public class MenuItemServiceTests
{
    private readonly Mock<IMenuItemRepository>             _items;
    private readonly Mock<IMenuCategoryRepository>         _categories;
    private readonly Mock<IBlobStorageService>             _blob;
    private readonly Mock<IValidator<CreateMenuItemRequest>> _createVal;
    private readonly Mock<IValidator<UpdateMenuItemRequest>> _updateVal;
    private readonly MenuItemService _sut;
    private readonly Guid _performedBy = Guid.NewGuid();

    public MenuItemServiceTests()
    {
        _items      = new Mock<IMenuItemRepository>();
        _categories = new Mock<IMenuCategoryRepository>();
        _blob       = new Mock<IBlobStorageService>();
        _createVal  = new Mock<IValidator<CreateMenuItemRequest>>();
        _updateVal  = new Mock<IValidator<UpdateMenuItemRequest>>();

        _sut = new MenuItemService(
            _items.Object,
            _categories.Object,
            _blob.Object,
            _createVal.Object,
            _updateVal.Object);
    }

    // ─── helpers ────────────────────────────────────────────────────────────

    private static MenuCategory MakeCategory(string name = "Mains")
        => new() { Name = name };

    private static MenuItem MakeItem(
        MenuCategory? category = null,
        string name = "Burger",
        decimal price = 9.99m,
        bool isAvailable = true,
        string? photoUrl = null)
    {
        category ??= MakeCategory();
        return new MenuItem
        {
            Name        = name,
            Price       = price,
            CategoryId  = category.Id,
            Category    = category,
            IsAvailable = isAvailable,
            PhotoUrl    = photoUrl
        };
    }

    private void SetupCreateValidationPass()
        => _createVal
            .Setup(v => v.ValidateAsync(It.IsAny<CreateMenuItemRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult());

    private void SetupCreateValidationFail()
        => _createVal
            .Setup(v => v.ValidateAsync(It.IsAny<CreateMenuItemRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult(new List<ValidationFailure> { new("Name", "error") }));

    private void SetupUpdateValidationPass()
        => _updateVal
            .Setup(v => v.ValidateAsync(It.IsAny<UpdateMenuItemRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult());

    private void SetupUpdateValidationFail()
        => _updateVal
            .Setup(v => v.ValidateAsync(It.IsAny<UpdateMenuItemRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult(new List<ValidationFailure> { new("Name", "error") }));

    // ─── GetPagedAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetPagedAsync_ReturnsMappedPagedResult()
    {
        // Arrange
        var cat   = MakeCategory();
        var item1 = MakeItem(cat, "Burger");
        var item2 = MakeItem(cat, "Pasta");
        var list  = (IReadOnlyList<MenuItem>)new List<MenuItem> { item1, item2 };

        _items
            .Setup(r => r.GetPagedAsync(It.IsAny<Guid?>(), It.IsAny<string?>(),
                                        It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((list, 5));

        var query = new MenuItemQueryParams(null, null, 1, 2);

        // Act
        var result = await _sut.GetPagedAsync(query);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.TotalCount.Should().Be(5);
        result.Value.TotalPages.Should().Be(3);   // Math.Ceiling(5 / 2.0) = 3
        result.Value.Items.Should().HaveCount(2);
        result.Value.Items.Select(d => d.Name).Should().BeEquivalentTo(new[] { "Burger", "Pasta" });
    }

    [Fact]
    public async Task GetPagedAsync_WhenNoItems_ReturnsEmptyPagedResult()
    {
        // Arrange
        var emptyList = (IReadOnlyList<MenuItem>)new List<MenuItem>();

        _items
            .Setup(r => r.GetPagedAsync(It.IsAny<Guid?>(), It.IsAny<string?>(),
                                        It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((emptyList, 0));

        var query = new MenuItemQueryParams(null, null, 1, 2);

        // Act
        var result = await _sut.GetPagedAsync(query);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Items.Should().BeEmpty();
        result.Value.TotalCount.Should().Be(0);
        result.Value.TotalPages.Should().Be(0);   // Math.Ceiling(0 / 2.0) = 0
    }

    // ─── GetByIdAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task GetByIdAsync_WhenItemExists_ReturnsDto()
    {
        // Arrange
        var cat  = MakeCategory("Starters");
        var item = MakeItem(cat, "Spring Roll", price: 5.50m);

        _items
            .Setup(r => r.GetByIdAsync(item.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(item);

        // Act
        var result = await _sut.GetByIdAsync(item.Id);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Name.Should().Be("Spring Roll");
        result.Value.Price.Should().Be(5.50m);
        result.Value.CategoryName.Should().Be("Starters");
    }

    [Fact]
    public async Task GetByIdAsync_WhenItemNotFound_ReturnsNotFound()
    {
        // Arrange
        _items
            .Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MenuItem?)null);

        // Act
        var result = await _sut.GetByIdAsync(Guid.NewGuid());

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorType.Should().Be(ResultError.NotFound);
    }

    // ─── CreateAsync ─────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_WhenValidationFails_ReturnsValidationFailure()
    {
        // Arrange
        SetupCreateValidationFail();
        var request = new CreateMenuItemRequest("", null, 0m, Guid.NewGuid(), true, 1);

        // Act
        var result = await _sut.CreateAsync(request, null, null, null, _performedBy);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorType.Should().Be(ResultError.Validation);
    }

    [Fact]
    public async Task CreateAsync_WhenCategoryNotFound_ReturnsNotFound()
    {
        // Arrange
        SetupCreateValidationPass();
        _categories
            .Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MenuCategory?)null);

        var request = new CreateMenuItemRequest("Burger", null, 9.99m, Guid.NewGuid(), true, 1);

        // Act
        var result = await _sut.CreateAsync(request, null, null, null, _performedBy);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorType.Should().Be(ResultError.NotFound);
    }

    [Fact]
    public async Task CreateAsync_WhenNoImage_CreatesItemWithNullPhotoUrl()
    {
        // Arrange
        SetupCreateValidationPass();
        var cat = MakeCategory();
        _categories
            .Setup(r => r.GetByIdAsync(cat.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(cat);
        _items.Setup(r => r.AddAsync(It.IsAny<MenuItem>(), It.IsAny<CancellationToken>()))
              .Returns(Task.CompletedTask);
        _items.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
              .ReturnsAsync(1);

        var request = new CreateMenuItemRequest("Burger", null, 9.99m, cat.Id, true, 1);

        // Act
        var result = await _sut.CreateAsync(request, null, null, null, _performedBy);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.PhotoUrl.Should().BeNull();
        _blob.Verify(b => b.UploadAsync(It.IsAny<Stream>(), It.IsAny<string>(),
                                        It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_WhenImageProvided_UploadsAndSetsPhotoUrl()
    {
        // Arrange
        SetupCreateValidationPass();
        var cat          = MakeCategory();
        const string url = "https://cdn.example.com/burger.jpg";

        _categories
            .Setup(r => r.GetByIdAsync(cat.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(cat);
        _items.Setup(r => r.AddAsync(It.IsAny<MenuItem>(), It.IsAny<CancellationToken>()))
              .Returns(Task.CompletedTask);
        _items.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
              .ReturnsAsync(1);
        _blob.Setup(b => b.UploadAsync(It.IsAny<Stream>(), It.IsAny<string>(),
                                       It.IsAny<string>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync(url);

        var request    = new CreateMenuItemRequest("Burger", null, 9.99m, cat.Id, true, 1);
        var imageStream = new MemoryStream(new byte[] { 1, 2, 3 });

        // Act
        var result = await _sut.CreateAsync(request, imageStream, "burger.jpg", "image/jpeg", _performedBy);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.PhotoUrl.Should().Be(url);
        _blob.Verify(b => b.UploadAsync(imageStream, "burger.jpg", "image/jpeg",
                                        It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_HappyPath_CallsAddAsyncAndSave()
    {
        // Arrange
        SetupCreateValidationPass();
        var cat = MakeCategory();
        _categories
            .Setup(r => r.GetByIdAsync(cat.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(cat);
        _items.Setup(r => r.AddAsync(It.IsAny<MenuItem>(), It.IsAny<CancellationToken>()))
              .Returns(Task.CompletedTask);
        _items.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
              .ReturnsAsync(1);

        var request = new CreateMenuItemRequest("Pasta", "Fresh pasta", 12.50m, cat.Id, true, 2);

        // Act
        var result = await _sut.CreateAsync(request, null, null, null, _performedBy);

        // Assert
        result.IsSuccess.Should().BeTrue();
        _items.Verify(r => r.AddAsync(It.IsAny<MenuItem>(), It.IsAny<CancellationToken>()), Times.Once);
        _items.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    // ─── UpdateAsync ─────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateAsync_WhenValidationFails_ReturnsValidationFailure()
    {
        // Arrange
        SetupUpdateValidationFail();
        var request = new UpdateMenuItemRequest("", null, 0m, Guid.NewGuid(), true, 1);

        // Act
        var result = await _sut.UpdateAsync(Guid.NewGuid(), request, null, null, null, _performedBy);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorType.Should().Be(ResultError.Validation);
    }

    [Fact]
    public async Task UpdateAsync_WhenItemNotFound_ReturnsNotFound()
    {
        // Arrange
        SetupUpdateValidationPass();
        _items
            .Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MenuItem?)null);

        var request = new UpdateMenuItemRequest("Burger", null, 9.99m, Guid.NewGuid(), true, 1);

        // Act
        var result = await _sut.UpdateAsync(Guid.NewGuid(), request, null, null, null, _performedBy);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorType.Should().Be(ResultError.NotFound);
    }

    [Fact]
    public async Task UpdateAsync_WhenCategoryNotFound_ReturnsNotFound()
    {
        // Arrange
        SetupUpdateValidationPass();
        var item = MakeItem();
        _items
            .Setup(r => r.GetByIdAsync(item.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(item);
        _categories
            .Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MenuCategory?)null);

        var request = new UpdateMenuItemRequest("Burger", null, 9.99m, Guid.NewGuid(), true, 1);

        // Act
        var result = await _sut.UpdateAsync(item.Id, request, null, null, null, _performedBy);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorType.Should().Be(ResultError.NotFound);
    }

    [Fact]
    public async Task UpdateAsync_WhenImageProvided_DeletesOldAndUploadsNew()
    {
        // Arrange
        SetupUpdateValidationPass();
        const string oldUrl = "https://cdn.example.com/old.jpg";
        const string newUrl = "https://cdn.example.com/new.jpg";

        var cat  = MakeCategory();
        var item = MakeItem(cat, photoUrl: oldUrl);

        _items
            .Setup(r => r.GetByIdAsync(item.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(item);
        _categories
            .Setup(r => r.GetByIdAsync(cat.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(cat);
        _items.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
              .ReturnsAsync(1);
        _blob.Setup(b => b.DeleteAsync(oldUrl, It.IsAny<CancellationToken>()))
             .Returns(Task.CompletedTask);
        _blob.Setup(b => b.UploadAsync(It.IsAny<Stream>(), It.IsAny<string>(),
                                       It.IsAny<string>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync(newUrl);

        var request     = new UpdateMenuItemRequest("Burger Updated", null, 11.00m, cat.Id, true, 1);
        var imageStream = new MemoryStream(new byte[] { 4, 5, 6 });

        // Act
        var result = await _sut.UpdateAsync(item.Id, request, imageStream, "new.jpg", "image/jpeg", _performedBy);

        // Assert
        result.IsSuccess.Should().BeTrue();
        _blob.Verify(b => b.DeleteAsync(oldUrl, It.IsAny<CancellationToken>()), Times.Once);
        _blob.Verify(b => b.UploadAsync(It.IsAny<Stream>(), It.IsAny<string>(),
                                        It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    // ─── DeleteAsync ─────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteAsync_WhenItemNotFound_ReturnsNotFound()
    {
        // Arrange
        _items
            .Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MenuItem?)null);

        // Act
        var result = await _sut.DeleteAsync(Guid.NewGuid(), _performedBy);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorType.Should().Be(ResultError.NotFound);
    }

    [Fact]
    public async Task DeleteAsync_WhenItemHasPhoto_DeletesBlobAndSetsIsDeleted()
    {
        // Arrange
        const string photoUrl = "https://cdn.example.com/img.jpg";
        var item = MakeItem(photoUrl: photoUrl);

        _items
            .Setup(r => r.GetByIdAsync(item.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(item);
        _blob.Setup(b => b.DeleteAsync(photoUrl, It.IsAny<CancellationToken>()))
             .Returns(Task.CompletedTask);
        _items.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
              .ReturnsAsync(1);

        // Act
        var result = await _sut.DeleteAsync(item.Id, _performedBy);

        // Assert
        result.IsSuccess.Should().BeTrue();
        _blob.Verify(b => b.DeleteAsync(photoUrl, It.IsAny<CancellationToken>()), Times.Once);
        item.IsDeleted.Should().BeTrue();
    }

    // ─── ToggleAvailabilityAsync ─────────────────────────────────────────────

    [Fact]
    public async Task ToggleAvailabilityAsync_WhenItemNotFound_ReturnsNotFound()
    {
        // Arrange
        _items
            .Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MenuItem?)null);

        // Act
        var result = await _sut.ToggleAvailabilityAsync(Guid.NewGuid(), _performedBy);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorType.Should().Be(ResultError.NotFound);
    }

    [Fact]
    public async Task ToggleAvailabilityAsync_TogglesAvailabilityAndSaves()
    {
        // Arrange — item starts as available
        var item = MakeItem(isAvailable: true);

        _items
            .Setup(r => r.GetByIdAsync(item.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(item);
        _items.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
              .ReturnsAsync(1);

        // Act
        var result = await _sut.ToggleAvailabilityAsync(item.Id, _performedBy);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.IsAvailable.Should().BeFalse();   // flipped from true → false
        _items.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }
}
