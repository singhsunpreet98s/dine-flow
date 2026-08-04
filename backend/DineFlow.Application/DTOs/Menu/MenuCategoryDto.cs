namespace DineFlow.Application.DTOs.Menu;

public record MenuCategoryDto(Guid Id, string Name, int SortOrder, bool IsActive, int ItemCount);
