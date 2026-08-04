using DineFlow.Application.DTOs;
using DineFlow.Application.DTOs.Auth;
using DineFlow.Domain.Common;

namespace DineFlow.Application.Services;

public interface IAuthService
{
    Task<Result<AuthResponse>> RegisterAsync(RegisterRequest request, CancellationToken ct = default);
    Task<Result<AuthResponse>> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task<Result<AppUserDto>> CreateSubUserAsync(CreateSubUserRequest request, Guid adminId, CancellationToken ct = default);
    Task<Result<bool>> SetRestaurantNameAsync(SetRestaurantNameRequest request, Guid adminId, CancellationToken ct = default);
    Task<Result<IReadOnlyList<AppUserDto>>> GetAllUsersAsync(Guid adminId, CancellationToken ct = default);
    Task<Result<AuthResponse>> UpdateTimezoneAsync(UpdateTimezoneRequest request, Guid performingUserId, CancellationToken ct = default);
}
