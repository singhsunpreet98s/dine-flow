using DineFlow.Application.DTOs.Floor;
using DineFlow.Domain.Common;
using DineFlow.Domain.Entities;
using DineFlow.Domain.Enums;
using DineFlow.Domain.Interfaces;
using FluentValidation;

namespace DineFlow.Application.Services;

public class FloorService : IFloorService
{
    private readonly IFloorRepository _floors;
    private readonly IOrderRepository _orders;
    private readonly IValidator<CreateFloorRequest> _createFloorVal;
    private readonly IValidator<UpdateFloorRequest> _updateFloorVal;
    private readonly IValidator<CreateTableRequest> _createTableVal;
    private readonly IValidator<UpdateTableRequest> _updateTableVal;
    private readonly IValidator<SaveLayoutRequest> _saveLayoutVal;

    public FloorService(
        IFloorRepository floors,
        IOrderRepository orders,
        IValidator<CreateFloorRequest> createFloorVal,
        IValidator<UpdateFloorRequest> updateFloorVal,
        IValidator<CreateTableRequest> createTableVal,
        IValidator<UpdateTableRequest> updateTableVal,
        IValidator<SaveLayoutRequest> saveLayoutVal)
    {
        _floors = floors;
        _orders = orders;
        _createFloorVal = createFloorVal;
        _updateFloorVal = updateFloorVal;
        _createTableVal = createTableVal;
        _updateTableVal = updateTableVal;
        _saveLayoutVal = saveLayoutVal;
    }

    public async Task<Result<List<FloorDto>>> GetAllFloorsAsync(CancellationToken ct = default)
    {
        var floors = await _floors.GetAllAsync();
        var dtos = floors.Select(MapFloorToDto).ToList();
        return Result<List<FloorDto>>.Success(dtos);
    }

    public async Task<Result<FloorDto>> CreateFloorAsync(CreateFloorRequest request, Guid performedBy, CancellationToken ct = default)
    {
        var v = await _createFloorVal.ValidateAsync(request, ct);
        if (!v.IsValid)
            return Result<FloorDto>.Failure(ResultError.Validation, string.Join("; ", v.Errors.Select(e => e.ErrorMessage)));

        var floor = new Floor
        {
            Name = request.Name,
            DisplayOrder = request.DisplayOrder,
            CreatedBy = performedBy.ToString()
        };

        await _floors.AddAsync(floor);
        await _floors.SaveChangesAsync();
        return Result<FloorDto>.Success(MapFloorToDto(floor));
    }

    public async Task<Result<FloorDto>> UpdateFloorAsync(Guid id, UpdateFloorRequest request, Guid performedBy, CancellationToken ct = default)
    {
        var v = await _updateFloorVal.ValidateAsync(request, ct);
        if (!v.IsValid)
            return Result<FloorDto>.Failure(ResultError.Validation, string.Join("; ", v.Errors.Select(e => e.ErrorMessage)));

        var floor = await _floors.GetByIdWithTablesAsync(id);
        if (floor is null)
            return Result<FloorDto>.Failure(ResultError.NotFound, "Floor not found.");

        floor.Name = request.Name;
        floor.DisplayOrder = request.DisplayOrder;
        floor.UpdatedBy = performedBy.ToString();

        await _floors.SaveChangesAsync();
        return Result<FloorDto>.Success(MapFloorToDto(floor));
    }

    public async Task<Result<bool>> DeleteFloorAsync(Guid id, Guid performedBy, CancellationToken ct = default)
    {
        var floor = await _floors.GetByIdAsync(id);
        if (floor is null)
            return Result<bool>.Failure(ResultError.NotFound, "Floor not found.");

        var hasActiveOrders = await _floors.HasActiveOrdersOnFloorAsync(id);
        if (hasActiveOrders)
            return Result<bool>.Failure(ResultError.Validation, "Cannot delete floor with active orders.");

        floor.IsDeleted = true;
        floor.UpdatedBy = performedBy.ToString();
        await _floors.SaveChangesAsync();
        return Result<bool>.Success(true);
    }

    public async Task<Result<RestaurantTableDto>> CreateTableAsync(CreateTableRequest request, Guid performedBy, CancellationToken ct = default)
    {
        var v = await _createTableVal.ValidateAsync(request, ct);
        if (!v.IsValid)
            return Result<RestaurantTableDto>.Failure(ResultError.Validation, string.Join("; ", v.Errors.Select(e => e.ErrorMessage)));

        var floor = await _floors.GetByIdAsync(request.FloorId);
        if (floor is null)
            return Result<RestaurantTableDto>.Failure(ResultError.NotFound, "Floor not found.");

        if (!Enum.TryParse<TableShape>(request.Shape, out var shape))
            return Result<RestaurantTableDto>.Failure(ResultError.Validation, "Invalid table shape.");

        var table = new RestaurantTable
        {
            FloorId = request.FloorId,
            TableNumber = request.TableNumber,
            Capacity = request.Capacity,
            Shape = shape,
            PositionX = request.PositionX,
            PositionY = request.PositionY,
            Width = request.Width,
            Height = request.Height,
            Status = TableStatus.Available,
            CreatedBy = performedBy.ToString()
        };

        await _floors.AddTableAsync(table);
        await _floors.SaveChangesAsync();
        return Result<RestaurantTableDto>.Success(MapTableToDto(table));
    }

    public async Task<Result<RestaurantTableDto>> UpdateTableAsync(Guid id, UpdateTableRequest request, Guid performedBy, CancellationToken ct = default)
    {
        var v = await _updateTableVal.ValidateAsync(request, ct);
        if (!v.IsValid)
            return Result<RestaurantTableDto>.Failure(ResultError.Validation, string.Join("; ", v.Errors.Select(e => e.ErrorMessage)));

        var table = await _floors.GetTableByIdAsync(id);
        if (table is null)
            return Result<RestaurantTableDto>.Failure(ResultError.NotFound, "Table not found.");

        if (!Enum.TryParse<TableShape>(request.Shape, out var shape))
            return Result<RestaurantTableDto>.Failure(ResultError.Validation, "Invalid table shape.");

        if (!Enum.TryParse<TableStatus>(request.Status, out var status))
            return Result<RestaurantTableDto>.Failure(ResultError.Validation, "Invalid table status.");

        table.TableNumber = request.TableNumber;
        table.Capacity = request.Capacity;
        table.Shape = shape;
        table.PositionX = request.PositionX;
        table.PositionY = request.PositionY;
        table.Width = request.Width;
        table.Height = request.Height;
        table.Status = status;
        table.UpdatedBy = performedBy.ToString();

        await _floors.SaveChangesAsync();
        return Result<RestaurantTableDto>.Success(MapTableToDto(table));
    }

    public async Task<Result<bool>> DeleteTableAsync(Guid id, Guid performedBy, CancellationToken ct = default)
    {
        var table = await _floors.GetTableByIdAsync(id);
        if (table is null)
            return Result<bool>.Failure(ResultError.NotFound, "Table not found.");

        table.IsDeleted = true;
        table.UpdatedBy = performedBy.ToString();
        await _floors.SaveChangesAsync();
        return Result<bool>.Success(true);
    }

    public async Task<Result<bool>> SaveLayoutAsync(Guid floorId, SaveLayoutRequest request, Guid performedBy, CancellationToken ct = default)
    {
        var v = await _saveLayoutVal.ValidateAsync(request, ct);
        if (!v.IsValid)
            return Result<bool>.Failure(ResultError.Validation, string.Join("; ", v.Errors.Select(e => e.ErrorMessage)));

        var floor = await _floors.GetByIdWithTablesAsync(floorId);
        if (floor is null)
            return Result<bool>.Failure(ResultError.NotFound, "Floor not found.");

        foreach (var item in request.Tables)
        {
            var table = floor.Tables.FirstOrDefault(t => t.Id == item.Id);
            if (table is null) continue;

            table.PositionX = item.PositionX;
            table.PositionY = item.PositionY;
            table.Width = item.Width;
            table.Height = item.Height;
            table.UpdatedBy = performedBy.ToString();
        }

        await _floors.SaveChangesAsync();
        return Result<bool>.Success(true);
    }

    public async Task<Result<IReadOnlyList<FloorLiveDto>>> GetLiveFloorsAsync(CancellationToken ct = default)
    {
        var floors = await _floors.GetAllAsync();

        var activeOrders = await _orders.GetActiveOrdersForRestaurantTablesAsync(ct);

        var ordersByTableId = activeOrders
            .Where(o => o.RestaurantTableId.HasValue)
            .ToDictionary(o => o.RestaurantTableId!.Value);

        var result = floors
            .OrderBy(f => f.DisplayOrder)
            .Select(f => new FloorLiveDto(
                f.Id,
                f.Name,
                f.DisplayOrder,
                f.Tables
                    .Select(t =>
                    {
                        ordersByTableId.TryGetValue(t.Id, out var order);
                        ActiveOrderSummaryDto? orderSummary = null;
                        if (order != null)
                        {
                            orderSummary = new ActiveOrderSummaryDto(
                                order.Id,
                                order.OrderNumber,
                                order.Status.ToString(),
                                order.MemberCount,
                                order.TotalAmount,
                                order.CreatedAt,
                                order.Items
                                    .Select(i => new OrderItemLiveDto(
                                        i.MenuItem?.Name ?? string.Empty,
                                        i.Quantity,
                                        i.CustomizationNote))
                                    .ToList(),
                                order.AssignedWaiterName,
                                order.CustomerName);
                        }
                        // Derive effective status from active-order presence so the live
                        // view is always consistent with reality, regardless of whether
                        // RestaurantTable.Status was written correctly in the DB.
                        var effectiveStatus = order != null ? "Occupied" : t.Status.ToString();

                        return new TableLiveDto(
                            t.Id,
                            t.TableNumber,
                            t.Capacity,
                            t.Shape.ToString(),
                            t.PositionX,
                            t.PositionY,
                            t.Width,
                            t.Height,
                            effectiveStatus,
                            orderSummary);
                    })
                    .ToList()))
            .ToList();

        return Result<IReadOnlyList<FloorLiveDto>>.Success(result);
    }

    public async Task<Result<bool>> SetTableStatusAsync(Guid tableId, TableStatus status, CancellationToken ct = default)
    {
        var table = await _floors.GetTableByIdAsync(tableId);
        if (table is null)
            return Result<bool>.Failure(ResultError.NotFound, "Table not found.");

        table.Status = status;
        await _floors.SaveChangesAsync();
        return Result<bool>.Success(true);
    }

    private static FloorDto MapFloorToDto(Floor floor) => new()
    {
        Id = floor.Id,
        Name = floor.Name,
        DisplayOrder = floor.DisplayOrder,
        Tables = floor.Tables.Select(MapTableToDto).ToList()
    };

    private static RestaurantTableDto MapTableToDto(RestaurantTable table) => new()
    {
        Id = table.Id,
        FloorId = table.FloorId,
        TableNumber = table.TableNumber,
        Capacity = table.Capacity,
        Shape = table.Shape.ToString(),
        PositionX = table.PositionX,
        PositionY = table.PositionY,
        Width = table.Width,
        Height = table.Height,
        Status = table.Status.ToString()
    };
}
