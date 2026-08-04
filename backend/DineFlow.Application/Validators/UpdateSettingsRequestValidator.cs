using DineFlow.Application.DTOs;
using FluentValidation;

namespace DineFlow.Application.Validators;

public class UpdateSettingsRequestValidator : AbstractValidator<UpdateSettingsRequest>
{
    private static readonly string[] ValidAccentColors =
    [
        "blue", "indigo", "violet", "rose", "orange",
        "amber", "green", "teal", "cyan", "slate", "pink", "red"
    ];

    public UpdateSettingsRequestValidator()
    {
        When(r => r.Name is not null, () =>
        {
            RuleFor(r => r.Name)
                .NotEmpty().WithMessage("Name cannot be empty.")
                .MaximumLength(200).WithMessage("Name must be 200 characters or fewer.");
        });

        When(r => r.ThemeAccentColor is not null, () =>
        {
            RuleFor(r => r.ThemeAccentColor)
                .Must(c => ValidAccentColors.Contains(c))
                .WithMessage($"ThemeAccentColor must be one of: {string.Join(", ", ValidAccentColors)}.");
        });
    }
}
