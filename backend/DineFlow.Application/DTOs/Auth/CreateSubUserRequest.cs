using DineFlow.Domain.Enums;

namespace DineFlow.Application.DTOs.Auth;

public record CreateSubUserRequest(string Name, string Email, string Password, UserRole Role);
