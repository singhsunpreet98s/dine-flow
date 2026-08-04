using DineFlow.Application.DTOs;
using DineFlow.Application.DTOs.Auth;
using DineFlow.Domain.Common;
using DineFlow.Domain.Entities;
using DineFlow.Domain.Enums;
using DineFlow.Domain.Interfaces;
using FluentValidation;

namespace DineFlow.Application.Services;

public class AuthService : IAuthService
{
    private readonly IAppUserRepository _users;
    private readonly IRestaurantSettingsRepository _restaurant;
    private readonly IJwtTokenService _jwt;
    private readonly IPasswordHasher _hasher;
    private readonly IValidator<RegisterRequest> _registerVal;
    private readonly IValidator<LoginRequest> _loginVal;
    private readonly IValidator<CreateSubUserRequest> _createVal;
    private readonly IValidator<SetRestaurantNameRequest> _nameVal;
    private readonly IValidator<UpdateTimezoneRequest> _timezoneVal;

    public AuthService(
        IAppUserRepository users,
        IRestaurantSettingsRepository restaurant,
        IJwtTokenService jwt,
        IPasswordHasher hasher,
        IValidator<RegisterRequest> registerVal,
        IValidator<LoginRequest> loginVal,
        IValidator<CreateSubUserRequest> createVal,
        IValidator<SetRestaurantNameRequest> nameVal,
        IValidator<UpdateTimezoneRequest> timezoneVal)
    {
        _users = users;
        _restaurant = restaurant;
        _jwt = jwt;
        _hasher = hasher;
        _registerVal = registerVal;
        _loginVal = loginVal;
        _createVal = createVal;
        _nameVal = nameVal;
        _timezoneVal = timezoneVal;
    }

    public async Task<Result<AuthResponse>> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var v = await _registerVal.ValidateAsync(request, ct);
        if (!v.IsValid)
            return Result<AuthResponse>.Failure(ResultError.Validation, string.Join("; ", v.Errors.Select(e => e.ErrorMessage)));

        if (await _users.AdminExistsAsync(ct))
            return Result<AuthResponse>.Failure(ResultError.Conflict, "An admin account already exists. Please log in.");

        if (await _users.GetByEmailAsync(request.Email, ct) is not null)
            return Result<AuthResponse>.Failure(ResultError.Conflict, "Email is already in use.");

        var user = new AppUser
        {
            Name = request.Name,
            Email = request.Email,
            PasswordHash = _hasher.Hash(request.Password),
            Role = UserRole.Admin,
            IsActive = true
        };

        await _users.AddAsync(user, ct);
        await _users.SaveChangesAsync(ct);

        var isSetupComplete = await _restaurant.GetAsync(ct) is not null;
        var token = _jwt.GenerateToken(user);
        return Result<AuthResponse>.Success(new AuthResponse(token, user.Id, user.Name, user.Role, isSetupComplete, user.TimeZoneId));
    }

    public async Task<Result<AuthResponse>> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var v = await _loginVal.ValidateAsync(request, ct);
        if (!v.IsValid)
            return Result<AuthResponse>.Failure(ResultError.Validation, string.Join("; ", v.Errors.Select(e => e.ErrorMessage)));

        var user = await _users.GetByEmailAsync(request.Email, ct);
        if (user is null || !user.IsActive)
            return Result<AuthResponse>.Failure(ResultError.Unauthorized, "Invalid email or password.");

        if (!_hasher.Verify(request.Password, user.PasswordHash))
            return Result<AuthResponse>.Failure(ResultError.Unauthorized, "Invalid email or password.");

        var isSetupComplete = await _restaurant.GetAsync(ct) is not null;
        var token = _jwt.GenerateToken(user);
        return Result<AuthResponse>.Success(new AuthResponse(token, user.Id, user.Name, user.Role, isSetupComplete, user.TimeZoneId));
    }

    public async Task<Result<AppUserDto>> CreateSubUserAsync(CreateSubUserRequest request, Guid adminId, CancellationToken ct = default)
    {
        var v = await _createVal.ValidateAsync(request, ct);
        if (!v.IsValid)
            return Result<AppUserDto>.Failure(ResultError.Validation, string.Join("; ", v.Errors.Select(e => e.ErrorMessage)));

        var admin = await _users.GetByIdAsync(adminId, ct);
        if (admin is null || admin.Role != UserRole.Admin || !admin.IsActive)
            return Result<AppUserDto>.Failure(ResultError.Unauthorized, "Only an active Admin can create sub-users.");

        if (await _users.GetByEmailAsync(request.Email, ct) is not null)
            return Result<AppUserDto>.Failure(ResultError.Conflict, "A user with this email already exists.");

        var user = new AppUser
        {
            Name = request.Name,
            Email = request.Email,
            PasswordHash = _hasher.Hash(request.Password),
            Role = request.Role,
            IsActive = true,
            CreatedBy = adminId.ToString()
        };

        await _users.AddAsync(user, ct);
        await _users.SaveChangesAsync(ct);

        return Result<AppUserDto>.Success(new AppUserDto(user.Id, user.Name, user.Email, user.Role, user.IsActive, user.TimeZoneId));
    }

    public async Task<Result<bool>> SetRestaurantNameAsync(SetRestaurantNameRequest request, Guid adminId, CancellationToken ct = default)
    {
        var v = await _nameVal.ValidateAsync(request, ct);
        if (!v.IsValid)
            return Result<bool>.Failure(ResultError.Validation, string.Join("; ", v.Errors.Select(e => e.ErrorMessage)));

        var admin = await _users.GetByIdAsync(adminId, ct);
        if (admin is null || admin.Role != UserRole.Admin || !admin.IsActive)
            return Result<bool>.Failure(ResultError.Unauthorized, "Only an active Admin can set the restaurant name.");

        var settings = await _restaurant.GetAsync(ct);
        if (settings is not null)
        {
            settings.Name = request.Name;
        }
        else
        {
            settings = new RestaurantSettings
            {
                Name = request.Name,
                CreatedBy = adminId.ToString()
            };
            await _restaurant.AddAsync(settings, ct);
        }

        await _restaurant.SaveChangesAsync(ct);
        return Result<bool>.Success(true);
    }

    public async Task<Result<IReadOnlyList<AppUserDto>>> GetAllUsersAsync(Guid adminId, CancellationToken ct = default)
    {
        var admin = await _users.GetByIdAsync(adminId, ct);
        if (admin is null || admin.Role != UserRole.Admin || !admin.IsActive)
            return Result<IReadOnlyList<AppUserDto>>.Failure(ResultError.Unauthorized, "Only an active Admin can list users.");

        var users = await _users.GetAllActiveAsync(ct);
        var dtos = users.Select(u => new AppUserDto(u.Id, u.Name, u.Email, u.Role, u.IsActive, u.TimeZoneId)).ToList();
        return Result<IReadOnlyList<AppUserDto>>.Success(dtos);
    }

    public async Task<Result<AuthResponse>> UpdateTimezoneAsync(UpdateTimezoneRequest request, Guid performingUserId, CancellationToken ct = default)
    {
        var v = await _timezoneVal.ValidateAsync(request, ct);
        if (!v.IsValid)
            return Result<AuthResponse>.Failure(ResultError.Validation, string.Join("; ", v.Errors.Select(e => e.ErrorMessage)));

        var user = await _users.GetByIdAsync(performingUserId, ct);
        if (user is null)
            return Result<AuthResponse>.Failure(ResultError.NotFound, "User not found.");

        user.TimeZoneId = request.TimeZoneId;
        user.UpdatedAt = DateTime.UtcNow;
        user.UpdatedBy = performingUserId.ToString();
        await _users.SaveChangesAsync(ct);

        var isSetupComplete = await _restaurant.GetAsync(ct) is not null;
        var token = _jwt.GenerateToken(user);
        return Result<AuthResponse>.Success(new AuthResponse(token, user.Id, user.Name, user.Role, isSetupComplete, user.TimeZoneId));
    }
}
