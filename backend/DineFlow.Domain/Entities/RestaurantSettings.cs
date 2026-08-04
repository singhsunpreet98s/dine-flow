using DineFlow.Domain.Common;

namespace DineFlow.Domain.Entities;

public class RestaurantSettings : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string ThemeAccentColor { get; set; } = "blue";
}
