using DineFlow.Domain.Entities;

namespace DineFlow.Domain.Interfaces;

public interface IJwtTokenService
{
    string GenerateToken(AppUser user);
}
