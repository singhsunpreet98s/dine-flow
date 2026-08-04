using DineFlow.Domain.Common;
using Microsoft.AspNetCore.Mvc;

namespace DineFlow.API.Extensions;

public static class ResultExtensions
{
    public static IActionResult ToHttpResult<T>(this Result<T> result, ControllerBase controller)
        => result.Match<IActionResult>(
            onSuccess:  value => controller.Ok(value),
            onFailure:  err   => err.ErrorType switch
            {
                ResultError.Conflict     => controller.Conflict(new { message = err.Message }),
                ResultError.Validation   => controller.BadRequest(new { message = err.Message }),
                ResultError.Unauthorized => controller.Unauthorized(new { message = err.Message }),
                ResultError.NotFound     => controller.NotFound(new { message = err.Message }),
                _                        => controller.StatusCode(500, new { message = err.Message })
            });
}
