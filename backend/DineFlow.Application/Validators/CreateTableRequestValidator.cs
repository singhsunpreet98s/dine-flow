using DineFlow.Application.DTOs.Floor;
using FluentValidation;

namespace DineFlow.Application.Validators;

public class CreateTableRequestValidator : AbstractValidator<CreateTableRequest>
{
    private static readonly string[] ValidShapes = { "Square", "Round", "Rectangle" };

    public CreateTableRequestValidator()
    {
        RuleFor(x => x.FloorId).NotEmpty();
        RuleFor(x => x.TableNumber).NotEmpty().MaximumLength(20);
        RuleFor(x => x.Capacity).InclusiveBetween(1, 20);
        RuleFor(x => x.Shape)
            .NotEmpty()
            .Must(s => ValidShapes.Contains(s))
            .WithMessage("Shape must be one of: Square, Round, Rectangle.");
        RuleFor(x => x.PositionX).InclusiveBetween(0, 100);
        RuleFor(x => x.PositionY).InclusiveBetween(0, 100);
        RuleFor(x => x.Width).InclusiveBetween(1, 50);
        RuleFor(x => x.Height).InclusiveBetween(1, 50);
    }
}
