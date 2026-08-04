using DineFlow.Application.DTOs.Floor;
using FluentValidation;

namespace DineFlow.Application.Validators;

public class SaveLayoutRequestValidator : AbstractValidator<SaveLayoutRequest>
{
    public SaveLayoutRequestValidator()
    {
        RuleFor(x => x.FloorId).NotEmpty();
        RuleFor(x => x.Tables).NotNull();
    }
}
