namespace DineFlow.Application.DTOs.Menu;

public record PagedResult<T>(IReadOnlyList<T> Items, int TotalCount, int Page, int PageSize, int TotalPages);
