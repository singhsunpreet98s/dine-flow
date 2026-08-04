using DineFlow.Application.DTOs;
using DineFlow.Domain.Common;
using DineFlow.Domain.Entities;
using DineFlow.Domain.Interfaces;
using FluentValidation;

namespace DineFlow.Application.Services;

public class SettingsService : ISettingsService
{
    private readonly IRestaurantSettingsRepository _repo;
    private readonly IOrderHubNotifier _notifier;
    private readonly IValidator<UpdateSettingsRequest> _validator;

    public SettingsService(
        IRestaurantSettingsRepository repo,
        IOrderHubNotifier notifier,
        IValidator<UpdateSettingsRequest> validator)
    {
        _repo = repo;
        _notifier = notifier;
        _validator = validator;
    }

    public async Task<Result<SettingsDto>> GetAsync(CancellationToken ct = default)
    {
        var settings = await _repo.GetAsync(ct);
        if (settings is null)
            return Result<SettingsDto>.Success(new SettingsDto { Name = string.Empty, ThemeAccentColor = "blue" });

        return Result<SettingsDto>.Success(MapToDto(settings));
    }

    public async Task<Result<SettingsDto>> UpdateAsync(UpdateSettingsRequest request, CancellationToken ct = default)
    {
        var v = await _validator.ValidateAsync(request, ct);
        if (!v.IsValid)
            return Result<SettingsDto>.Failure(ResultError.Validation, string.Join("; ", v.Errors.Select(e => e.ErrorMessage)));

        var settings = await _repo.GetAsync(ct);
        if (settings is null)
        {
            settings = new RestaurantSettings();
            await _repo.AddAsync(settings, ct);
        }

        if (request.Name is not null && request.Name.Length > 0)
            settings.Name = request.Name;

        if (request.ThemeAccentColor is not null && request.ThemeAccentColor.Length > 0)
            settings.ThemeAccentColor = request.ThemeAccentColor;

        await _repo.SaveChangesAsync(ct);

        await _notifier.SendToGroupAsync(
            "all-users",
            "SettingsUpdated",
            new { themeAccentColor = settings.ThemeAccentColor },
            ct);

        return Result<SettingsDto>.Success(MapToDto(settings));
    }

    private static SettingsDto MapToDto(RestaurantSettings s) =>
        new() { Name = s.Name, ThemeAccentColor = s.ThemeAccentColor };
}
