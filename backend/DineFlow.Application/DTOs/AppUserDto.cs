using DineFlow.Domain.Enums;

namespace DineFlow.Application.DTOs;

public record AppUserDto(Guid Id, string Name, string Email, UserRole Role, bool IsActive, string TimeZoneId);
