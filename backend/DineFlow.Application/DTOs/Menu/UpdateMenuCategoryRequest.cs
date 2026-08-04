namespace DineFlow.Application.DTOs.Menu;

public record UpdateMenuCategoryRequest(string Name, int SortOrder, bool IsActive);
