using DineFlow.Application.DTOs.Orders;
using FluentValidation;

namespace DineFlow.Application.Validators;

public class AddItemsRequestValidator : AbstractValidator<AddItemsRequest>
{
    public AddItemsRequestValidator()
    {
        RuleFor(x => x.Items).NotEmpty().WithMessage("At least one item is required.");
        RuleForEach(x => x.Items).SetValidator(new CreateOrderItemRequestValidator());
    }
}
