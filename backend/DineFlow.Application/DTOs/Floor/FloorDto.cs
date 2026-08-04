namespace DineFlow.Application.DTOs.Floor;

public class FloorDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public List<RestaurantTableDto> Tables { get; set; } = new();
}
