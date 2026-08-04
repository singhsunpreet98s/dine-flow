namespace DineFlow.Application.DTOs.Menu;

public record MenuItemDto(
    Guid Id,
    string Name,
    string? Description,
    Guid CategoryId,
    string CategoryName,
    decimal Price,
    bool IsAvailable,
    string? PhotoUrl,
    int DisplayOrder);
