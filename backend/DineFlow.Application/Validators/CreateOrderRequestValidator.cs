using DineFlow.Application.DTOs.Orders;
using DineFlow.Domain.Enums;
using FluentValidation;

namespace DineFlow.Application.Validators;

public class CreateOrderItemRequestValidator : AbstractValidator<CreateOrderItemRequest>
{
    public CreateOrderItemRequestValidator()
    {
        RuleFor(x => x.MenuItemId).NotEmpty();
        RuleFor(x => x.Quantity).GreaterThan(0);
        RuleFor(x => x.CustomizationNote).MaximumLength(500);
    }
}

public class CreateOrderRequestValidator : AbstractValidator<CreateOrderRequest>
{
    public CreateOrderRequestValidator()
    {
        RuleFor(x => x.Channel).IsInEnum();
        RuleFor(x => x.MemberCount).GreaterThan(0);
        RuleFor(x => x.Items).NotEmpty().WithMessage("At least one item is required.");
        RuleForEach(x => x.Items).SetValidator(new CreateOrderItemRequestValidator());
        When(x => x.Channel == OrderChannel.DineIn, () =>
            RuleFor(x => x.RestaurantTableId).NotNull().NotEmpty().WithMessage("RestaurantTableId is required for DineIn orders."));
    }
}
