using DineFlow.Application.DTOs;
using DineFlow.Application.Services;
using DineFlow.Domain.Common;
using DineFlow.Domain.Entities;
using DineFlow.Domain.Interfaces;
using FluentAssertions;
using FluentValidation;
using FluentValidation.Results;
using Moq;

namespace DineFlow.Tests.Services;

/// <summary>
/// Unit tests for <see cref="SettingsService"/>.
/// All repository and infrastructure dependencies are mocked with Moq —
/// SettingsService does not depend on DbContext directly.
/// </summary>
public class SettingsServiceTests
{
    // ── mocks ─────────────────────────────────────────────────────────────────

    private readonly Mock<IRestaurantSettingsRepository> _repo = new();
    private readonly Mock<IOrderHubNotifier> _notifier = new();
    private readonly Mock<IValidator<UpdateSettingsRequest>> _validator = new();

    private readonly SettingsService _sut;

    public SettingsServiceTests()
    {
        // Default stubs — individual tests override where needed.
        _repo
            .Setup(r => r.AddAsync(It.IsAny<RestaurantSettings>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        _repo
            .Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);

        _notifier
            .Setup(n => n.SendToGroupAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<object>(),
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Default: validation passes (no errors).
        SetupValidValidation();

        _sut = new SettingsService(_repo.Object, _notifier.Object, _validator.Object);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private void SetupValidValidation() =>
        _validator
            .Setup(v => v.ValidateAsync(It.IsAny<UpdateSettingsRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult());

    private void SetupInvalidValidation(string field = "ThemeAccentColor", string message = "ThemeAccentColor must be one of: blue, indigo, violet, rose, orange, amber, green, teal, cyan, slate, pink, red") =>
        _validator
            .Setup(v => v.ValidateAsync(It.IsAny<UpdateSettingsRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult(new List<ValidationFailure>
            {
                new(field, message)
            }));

    private static RestaurantSettings MakeSettings(
        string name = "Spice Garden",
        string theme = "rose",
        decimal gstRate = 5m,
        string? logoUrl = "https://example.com/logo.png") =>
        new()
        {
            Name = name,
            ThemeAccentColor = theme,
            GstRate = gstRate,
            LogoUrl = logoUrl,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = "test",
            UpdatedAt = DateTime.UtcNow,
            UpdatedBy = "test",
        };

    // ── GetAsync ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAsync_WhenNoSettingsExist_ReturnsDefaultDto()
    {
        _repo
            .Setup(r => r.GetAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync((RestaurantSettings?)null);

        var result = await _sut.GetAsync();

        result.IsSuccess.Should().BeTrue();
        result.Value!.Name.Should().Be(string.Empty);
        result.Value.ThemeAccentColor.Should().Be("blue");
    }

    [Fact]
    public async Task GetAsync_WhenSettingsExist_ReturnsMappedDto()
    {
        var settings = MakeSettings(
            name: "Spice Garden",
            theme: "rose",
            gstRate: 5m,
            logoUrl: "https://example.com/logo.png");

        _repo
            .Setup(r => r.GetAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(settings);

        var result = await _sut.GetAsync();

        result.IsSuccess.Should().BeTrue();
        var dto = result.Value!;
        dto.Name.Should().Be("Spice Garden");
        dto.ThemeAccentColor.Should().Be("rose");
        dto.GstRate.Should().Be(5m);
        dto.LogoUrl.Should().Be("https://example.com/logo.png");
    }

    // ── UpdateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateAsync_WhenValidationFails_ReturnsValidationFailure()
    {
        SetupInvalidValidation();

        var request = new UpdateSettingsRequest { ThemeAccentColor = "neon-pink" };

        var result = await _sut.UpdateAsync(request);

        result.IsSuccess.Should().BeFalse();
        result.ErrorType.Should().Be(ResultError.Validation);
    }

    [Fact]
    public async Task UpdateAsync_WhenNoExistingSettings_CreatesNewRecord()
    {
        _repo
            .Setup(r => r.GetAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync((RestaurantSettings?)null);

        var request = new UpdateSettingsRequest { Name = "New Restaurant" };

        var result = await _sut.UpdateAsync(request);

        result.IsSuccess.Should().BeTrue();
        _repo.Verify(
            r => r.AddAsync(It.IsAny<RestaurantSettings>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_WhenSettingsExist_UpdatesExistingRecord()
    {
        var existing = MakeSettings(name: "Old Name");

        _repo
            .Setup(r => r.GetAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);

        var request = new UpdateSettingsRequest { Name = "New Name" };

        var result = await _sut.UpdateAsync(request);

        result.IsSuccess.Should().BeTrue();

        // No new record created — existing one mutated in place.
        _repo.Verify(
            r => r.AddAsync(It.IsAny<RestaurantSettings>(), It.IsAny<CancellationToken>()),
            Times.Never);

        _repo.Verify(
            r => r.SaveChangesAsync(It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_WhenNameIsNonNullNonEmpty_UpdatesName()
    {
        var existing = MakeSettings(name: "Old Name");

        _repo
            .Setup(r => r.GetAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);

        var request = new UpdateSettingsRequest { Name = "New Name" };

        var result = await _sut.UpdateAsync(request);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Name.Should().Be("New Name");
    }

    [Fact]
    public async Task UpdateAsync_WhenNameIsNull_DoesNotChangeExistingName()
    {
        var existing = MakeSettings(name: "Preserved Name");

        _repo
            .Setup(r => r.GetAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);

        // Name is intentionally omitted (null) — only GstRate is updated.
        var request = new UpdateSettingsRequest { GstRate = 12m };

        var result = await _sut.UpdateAsync(request);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Name.Should().Be("Preserved Name");
    }

    [Fact]
    public async Task UpdateAsync_WhenGstRateProvided_UpdatesGstRate()
    {
        var existing = MakeSettings(gstRate: 5m);

        _repo
            .Setup(r => r.GetAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);

        var request = new UpdateSettingsRequest { GstRate = 18m };

        var result = await _sut.UpdateAsync(request);

        result.IsSuccess.Should().BeTrue();
        result.Value!.GstRate.Should().Be(18m);
    }

    [Fact]
    public async Task UpdateAsync_AfterSave_BroadcastsSettingsUpdatedEvent()
    {
        var existing = MakeSettings();

        _repo
            .Setup(r => r.GetAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);

        var request = new UpdateSettingsRequest { Name = "Broadcast Test" };

        await _sut.UpdateAsync(request);

        _notifier.Verify(
            n => n.SendToGroupAsync(
                "all-users",
                "SettingsUpdated",
                It.IsAny<object>(),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_WhenThemeColorValid_UpdatesThemeColor()
    {
        var existing = MakeSettings(theme: "blue");

        _repo
            .Setup(r => r.GetAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);

        var request = new UpdateSettingsRequest { ThemeAccentColor = "rose" };

        var result = await _sut.UpdateAsync(request);

        result.IsSuccess.Should().BeTrue();
        result.Value!.ThemeAccentColor.Should().Be("rose");
    }

    // ── UpdateLogoAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateLogoAsync_WhenNoExistingSettings_CreatesNewRecordWithLogoUrl()
    {
        const string logoUrl = "https://cdn.example.com/logo.png";

        _repo
            .Setup(r => r.GetAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync((RestaurantSettings?)null);

        var result = await _sut.UpdateLogoAsync(logoUrl);

        result.IsSuccess.Should().BeTrue();
        result.Value!.LogoUrl.Should().Be(logoUrl);

        _repo.Verify(
            r => r.AddAsync(It.IsAny<RestaurantSettings>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task UpdateLogoAsync_WhenSettingsExist_UpdatesLogoUrl()
    {
        const string logoUrl = "https://cdn.example.com/new-logo.png";

        var existing = MakeSettings(logoUrl: "https://cdn.example.com/old-logo.png");

        _repo
            .Setup(r => r.GetAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);

        var result = await _sut.UpdateLogoAsync(logoUrl);

        result.IsSuccess.Should().BeTrue();
        result.Value!.LogoUrl.Should().Be(logoUrl);

        // Must not create a new record — existing one was mutated.
        _repo.Verify(
            r => r.AddAsync(It.IsAny<RestaurantSettings>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task UpdateLogoAsync_DoesNotBroadcastHubEvent()
    {
        _repo
            .Setup(r => r.GetAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(MakeSettings());

        await _sut.UpdateLogoAsync("https://cdn.example.com/logo.png");

        _notifier.Verify(
            n => n.SendToGroupAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<object>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
