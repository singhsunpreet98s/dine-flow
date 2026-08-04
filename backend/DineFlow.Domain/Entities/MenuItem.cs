using DineFlow.Domain.Common;

namespace DineFlow.Domain.Entities;

public class MenuItem : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid CategoryId { get; set; }
    public MenuCategory Category { get; set; } = null!;
    public decimal Price { get; set; }
    public bool IsAvailable { get; set; } = true;
    public string? PhotoUrl { get; set; }
    public int DisplayOrder { get; set; }
}
