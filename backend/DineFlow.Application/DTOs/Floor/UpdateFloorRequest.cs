namespace DineFlow.Application.DTOs.Floor;

public class UpdateFloorRequest
{
    public string Name { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
}
