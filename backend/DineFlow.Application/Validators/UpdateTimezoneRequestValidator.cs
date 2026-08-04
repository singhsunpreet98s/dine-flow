using DineFlow.Application.DTOs.Auth;
using FluentValidation;

namespace DineFlow.Application.Validators;

public class UpdateTimezoneRequestValidator : AbstractValidator<UpdateTimezoneRequest>
{
    public UpdateTimezoneRequestValidator()
    {
        RuleFor(x => x.TimeZoneId)
            .NotEmpty()
            .MaximumLength(64)
            .WithMessage("Invalid timezone identifier.");
    }
}
