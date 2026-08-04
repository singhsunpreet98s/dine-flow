namespace DineFlow.Application.DTOs.Menu;

public record UpdateMenuItemRequest(string Name, string? Description, decimal Price, Guid CategoryId, bool IsAvailable, int DisplayOrder);
