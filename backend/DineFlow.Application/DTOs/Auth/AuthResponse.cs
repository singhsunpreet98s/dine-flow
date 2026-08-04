using DineFlow.Domain.Enums;

namespace DineFlow.Application.DTOs.Auth;

public record AuthResponse(string Token, Guid UserId, string Name, UserRole Role, bool IsSetupComplete, string TimeZoneId);
