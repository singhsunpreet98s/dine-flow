using DineFlow.Domain.Entities;
using DineFlow.Domain.Interfaces;
using DineFlow.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DineFlow.Infrastructure.Repositories;

public class RestaurantSettingsRepository : IRestaurantSettingsRepository
{
    private readonly DineFlowDbContext _db;
    public RestaurantSettingsRepository(DineFlowDbContext db) => _db = db;

    public Task<RestaurantSettings?> GetAsync(CancellationToken ct = default)
        => _db.RestaurantSettings.FirstOrDefaultAsync(ct);

    public async Task AddAsync(RestaurantSettings settings, CancellationToken ct = default)
        => await _db.RestaurantSettings.AddAsync(settings, ct);

    public Task<int> SaveChangesAsync(CancellationToken ct = default)
        => _db.SaveChangesAsync(ct);
}
