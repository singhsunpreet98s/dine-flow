using DineFlow.API.Extensions;
using DineFlow.Application.DTOs.Auth;
using DineFlow.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DineFlow.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth) => _auth = auth;

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
        => (await _auth.RegisterAsync(request, ct)).ToHttpResult(this);

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
        => (await _auth.LoginAsync(request, ct)).ToHttpResult(this);

    [HttpPost("users")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateSubUser([FromBody] CreateSubUserRequest request, CancellationToken ct)
        => (await _auth.CreateSubUserAsync(request, User.GetUserId(), ct)).ToHttpResult(this);

    [HttpPatch("restaurant-name")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> SetRestaurantName([FromBody] SetRestaurantNameRequest request, CancellationToken ct)
        => (await _auth.SetRestaurantNameAsync(request, User.GetUserId(), ct)).ToHttpResult(this);

    [HttpGet("users")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetUsers(CancellationToken ct)
        => (await _auth.GetAllUsersAsync(User.GetUserId(), ct)).ToHttpResult(this);

    [HttpPatch("me/timezone")]
    [Authorize]
    public async Task<IActionResult> UpdateTimezone([FromBody] UpdateTimezoneRequest request, CancellationToken ct)
        => (await _auth.UpdateTimezoneAsync(request, User.GetUserId(), ct)).ToHttpResult(this);
}
