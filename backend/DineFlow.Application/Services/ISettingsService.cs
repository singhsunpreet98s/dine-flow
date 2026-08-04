using DineFlow.Application.DTOs;
using DineFlow.Domain.Common;

namespace DineFlow.Application.Services;

public interface ISettingsService
{
    Task<Result<SettingsDto>> GetAsync(CancellationToken ct = default);
    Task<Result<SettingsDto>> UpdateAsync(UpdateSettingsRequest request, CancellationToken ct = default);
}
