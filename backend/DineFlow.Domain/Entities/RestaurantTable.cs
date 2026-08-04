using DineFlow.Domain.Common;
using DineFlow.Domain.Enums;

namespace DineFlow.Domain.Entities;

public class RestaurantTable : BaseEntity
{
    public Guid FloorId { get; set; }
    public string TableNumber { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public TableShape Shape { get; set; }
    public double PositionX { get; set; }
    public double PositionY { get; set; }
    public double Width { get; set; }
    public double Height { get; set; }
    public TableStatus Status { get; set; } = TableStatus.Available;

    public Floor Floor { get; set; } = null!;
}
