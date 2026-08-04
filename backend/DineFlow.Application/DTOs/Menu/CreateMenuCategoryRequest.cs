namespace DineFlow.Application.DTOs.Menu;

public record CreateMenuCategoryRequest(string Name, int SortOrder, bool IsActive);
