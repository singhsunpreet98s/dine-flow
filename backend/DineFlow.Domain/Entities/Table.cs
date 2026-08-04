using DineFlow.Domain.Common;
using DineFlow.Domain.Enums;

namespace DineFlow.Domain.Entities;

public class Table : BaseEntity
{
    public string Number { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public TableStatus Status { get; set; } = TableStatus.Available;
    public string? FloorSection { get; set; }
}
