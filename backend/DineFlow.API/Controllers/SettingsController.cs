using DineFlow.API.Extensions;
using DineFlow.Application.DTOs;
using DineFlow.Application.Services;
using DineFlow.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DineFlow.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly ISettingsService _settingsService;
    private readonly IBlobStorageService _blobStorage;

    public SettingsController(ISettingsService settingsService, IBlobStorageService blobStorage)
    {
        _settingsService = settingsService;
        _blobStorage = blobStorage;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> Get(CancellationToken ct)
        => (await _settingsService.GetAsync(ct)).ToHttpResult(this);

    [HttpPatch]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update([FromBody] UpdateSettingsRequest request, CancellationToken ct)
        => (await _settingsService.UpdateAsync(request, ct)).ToHttpResult(this);

    [HttpPost("logo")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UploadLogo(IFormFile logo, CancellationToken ct)
    {
        if (logo is null)
            return BadRequest(new { message = "No file was provided." });

        if (!logo.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Only image files are allowed." });

        const long maxBytes = 2 * 1024 * 1024; // 2 MB
        if (logo.Length > maxBytes)
            return BadRequest(new { message = "File size must not exceed 2 MB." });

        var logoUrl = await _blobStorage.UploadAsync(logo.OpenReadStream(), logo.FileName, logo.ContentType, ct);
        var result = await _settingsService.UpdateLogoAsync(logoUrl, ct);
        return result.IsSuccess
            ? Ok(new { logoUrl })
            : result.ToHttpResult(this);
    }
}
