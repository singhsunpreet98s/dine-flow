using DineFlow.Domain.Entities;

namespace DineFlow.Domain.Interfaces;

public interface IRestaurantSettingsRepository
{
    Task<RestaurantSettings?> GetAsync(CancellationToken ct = default);
    Task AddAsync(RestaurantSettings settings, CancellationToken ct = default);
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
