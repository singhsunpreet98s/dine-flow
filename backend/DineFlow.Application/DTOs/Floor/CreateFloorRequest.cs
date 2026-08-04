namespace DineFlow.Application.DTOs.Floor;

public class CreateFloorRequest
{
    public string Name { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
}
