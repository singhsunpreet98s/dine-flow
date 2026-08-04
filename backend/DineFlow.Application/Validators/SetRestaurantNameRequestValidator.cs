using DineFlow.Application.DTOs.Auth;
using FluentValidation;

namespace DineFlow.Application.Validators;

public class SetRestaurantNameRequestValidator : AbstractValidator<SetRestaurantNameRequest>
{
    public SetRestaurantNameRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
    }
}
