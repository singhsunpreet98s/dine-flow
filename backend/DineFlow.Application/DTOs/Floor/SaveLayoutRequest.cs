namespace DineFlow.Application.DTOs.Floor;

public class SaveLayoutRequest
{
    public Guid FloorId { get; set; }
    public List<SaveLayoutTableItem> Tables { get; set; } = new();
}

public class SaveLayoutTableItem
{
    public Guid Id { get; set; }
    public double PositionX { get; set; }
    public double PositionY { get; set; }
    public double Width { get; set; }
    public double Height { get; set; }
}
