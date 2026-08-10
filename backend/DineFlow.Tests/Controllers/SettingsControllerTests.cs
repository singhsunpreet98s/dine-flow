using System.Net;
using System.Net.Http.Json;
using System.Text;
using DineFlow.Application.DTOs;
using DineFlow.Application.Services;
using DineFlow.Domain.Common;
using DineFlow.Domain.Interfaces;
using DineFlow.Tests.Controllers.Helpers;
using FluentAssertions;
using Moq;

namespace DineFlow.Tests.Controllers;

public class SettingsControllerTests : IClassFixture<DineFlowWebApplicationFactory>
{
    private readonly DineFlowWebApplicationFactory _factory;
    private readonly Mock<ISettingsService> _settingsMock;
    private readonly Mock<IBlobStorageService> _blobMock;

    public SettingsControllerTests(DineFlowWebApplicationFactory factory)
    {
        _factory      = factory;
        _settingsMock = factory.SettingsServiceMock;
        _blobMock     = factory.BlobStorageServiceMock;
        _settingsMock.Reset();
        _blobMock.Reset();
    }

    private static SettingsDto MakeSettingsDto() =>
        new() { Name = "My Restaurant", ThemeAccentColor = "#FF5733", GstRate = 5m };

    // ── GET /api/settings (AllowAnonymous) ───────────────────────────────────────────

    [Fact]
    public async Task Get_WhenAnonymous_Returns200()
    {
        _settingsMock
            .Setup(s => s.GetAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<SettingsDto>.Success(MakeSettingsDto()));

        var response = await _factory.CreateClient().GetAsync("/api/settings");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Get_WhenServiceFails_Returns500()
    {
        _settingsMock
            .Setup(s => s.GetAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<SettingsDto>.Failure(ResultError.Internal, "Unexpected error."));

        var response = await _factory.CreateClient().GetAsync("/api/settings");

        response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
    }

    // ── PATCH /api/settings (Admin only) ─────────────────────────────────────────────

    [Fact]
    public async Task Update_AsAdmin_Returns200()
    {
        _settingsMock
            .Setup(s => s.UpdateAsync(It.IsAny<UpdateSettingsRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<SettingsDto>.Success(MakeSettingsDto()));

        var response = await _factory.CreateClientWithRole("Admin")
            .PatchAsJsonAsync("/api/settings", new UpdateSettingsRequest { Name = "New Name", GstRate = 10m });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Update_AsWaiter_Returns403()
    {
        var response = await _factory.CreateClientWithRole("Waiter")
            .PatchAsJsonAsync("/api/settings", new UpdateSettingsRequest { Name = "New Name" });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Update_WhenUnauthenticated_Returns401()
    {
        var response = await _factory.CreateClient()
            .PatchAsJsonAsync("/api/settings", new UpdateSettingsRequest { Name = "New Name" });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── POST /api/settings/logo (Admin only) — inline controller validation ──────────

    [Fact]
    public async Task UploadLogo_WithNoFile_Returns400()
    {
        // Empty multipart — no "logo" part
        var form     = new MultipartFormDataContent();
        var response = await _factory.CreateClientWithRole("Admin").PostAsync("/api/settings/logo", form);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UploadLogo_WithNonImageContentType_Returns400()
    {
        var fileContent = new ByteArrayContent(Encoding.UTF8.GetBytes("fake pdf content"));
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf");

        var form = new MultipartFormDataContent();
        form.Add(fileContent, "logo", "document.pdf");

        var response = await _factory.CreateClientWithRole("Admin").PostAsync("/api/settings/logo", form);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UploadLogo_WithOversizedFile_Returns400()
    {
        // 3 MB > 2 MB limit
        var bigData     = new byte[3 * 1024 * 1024];
        var fileContent = new ByteArrayContent(bigData);
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/png");

        var form = new MultipartFormDataContent();
        form.Add(fileContent, "logo", "big.png");

        var response = await _factory.CreateClientWithRole("Admin").PostAsync("/api/settings/logo", form);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UploadLogo_AsAdmin_WithValidImage_Returns200WithLogoUrl()
    {
        const string uploadedUrl = "https://storage.example.com/logos/logo.png";
        _blobMock
            .Setup(b => b.UploadAsync(It.IsAny<Stream>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(uploadedUrl);
        _settingsMock
            .Setup(s => s.UpdateLogoAsync(uploadedUrl, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<SettingsDto>.Success(MakeSettingsDto()));

        var pngBytes    = new byte[] { 0x89, 0x50, 0x4E, 0x47 }; // PNG magic bytes
        var fileContent = new ByteArrayContent(pngBytes);
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/png");

        var form = new MultipartFormDataContent();
        form.Add(fileContent, "logo", "logo.png");

        var response = await _factory.CreateClientWithRole("Admin").PostAsync("/api/settings/logo", form);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        body.Should().ContainKey("logoUrl").WhoseValue.Should().Be(uploadedUrl);
    }

    [Fact]
    public async Task UploadLogo_WhenUnauthenticated_Returns401()
    {
        var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent(new byte[] { 1, 2 }), "logo", "logo.png");

        var response = await _factory.CreateClient().PostAsync("/api/settings/logo", form);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task UploadLogo_AsManager_Returns403()
    {
        var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent(new byte[] { 1, 2 }), "logo", "logo.png");

        var response = await _factory.CreateClientWithRole("Manager").PostAsync("/api/settings/logo", form);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
