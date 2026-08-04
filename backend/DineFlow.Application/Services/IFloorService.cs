using DineFlow.Application.DTOs.Floor;
using DineFlow.Domain.Common;
using DineFlow.Domain.Enums;

namespace DineFlow.Application.Services;

public interface IFloorService
{
    Task<Result<List<FloorDto>>> GetAllFloorsAsync(CancellationToken ct = default);
    Task<Result<FloorDto>> CreateFloorAsync(CreateFloorRequest request, Guid performedBy, CancellationToken ct = default);
    Task<Result<FloorDto>> UpdateFloorAsync(Guid id, UpdateFloorRequest request, Guid performedBy, CancellationToken ct = default);
    Task<Result<bool>> DeleteFloorAsync(Guid id, Guid performedBy, CancellationToken ct = default);
    Task<Result<RestaurantTableDto>> CreateTableAsync(CreateTableRequest request, Guid performedBy, CancellationToken ct = default);
    Task<Result<RestaurantTableDto>> UpdateTableAsync(Guid id, UpdateTableRequest request, Guid performedBy, CancellationToken ct = default);
    Task<Result<bool>> DeleteTableAsync(Guid id, Guid performedBy, CancellationToken ct = default);
    Task<Result<bool>> SaveLayoutAsync(Guid floorId, SaveLayoutRequest request, Guid performedBy, CancellationToken ct = default);
    Task<Result<IReadOnlyList<FloorLiveDto>>> GetLiveFloorsAsync(CancellationToken ct = default);
    Task<Result<bool>> SetTableStatusAsync(Guid tableId, TableStatus status, CancellationToken ct = default);
}
