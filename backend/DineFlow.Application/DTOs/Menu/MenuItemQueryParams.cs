namespace DineFlow.Application.DTOs.Menu;

public record MenuItemQueryParams(Guid? CategoryId, string? Search, int Page, int PageSize);
