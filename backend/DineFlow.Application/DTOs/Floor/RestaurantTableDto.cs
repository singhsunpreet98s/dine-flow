namespace DineFlow.Application.DTOs.Floor;

public class RestaurantTableDto
{
    public Guid Id { get; set; }
    public Guid FloorId { get; set; }
    public string TableNumber { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public string Shape { get; set; } = string.Empty;
    public double PositionX { get; set; }
    public double PositionY { get; set; }
    public double Width { get; set; }
    public double Height { get; set; }
    public string Status { get; set; } = string.Empty;
}
