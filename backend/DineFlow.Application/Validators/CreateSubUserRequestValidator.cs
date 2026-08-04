using DineFlow.Application.DTOs.Auth;
using DineFlow.Domain.Enums;
using FluentValidation;

namespace DineFlow.Application.Validators;

public class CreateSubUserRequestValidator : AbstractValidator<CreateSubUserRequest>
{
    public CreateSubUserRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8).MaximumLength(100);
        RuleFor(x => x.Role)
            .Must(r => r != UserRole.Admin)
            .WithMessage("Cannot create another Admin via this endpoint.");
    }
}
