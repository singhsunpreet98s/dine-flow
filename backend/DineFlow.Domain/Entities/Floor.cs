using DineFlow.Domain.Common;

namespace DineFlow.Domain.Entities;

public class Floor : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }

    public ICollection<RestaurantTable> Tables { get; set; } = new List<RestaurantTable>();
}
