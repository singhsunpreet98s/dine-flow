namespace DineFlow.Application.DTOs;

public class SettingsDto
{
    public string Name { get; set; } = string.Empty;
    public string ThemeAccentColor { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public decimal GstRate { get; set; }
}
