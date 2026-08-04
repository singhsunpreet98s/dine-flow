using DineFlow.Application.DTOs.Orders;
using FluentValidation;

namespace DineFlow.Application.Validators;

public class UpdateOrderStatusRequestValidator : AbstractValidator<UpdateOrderStatusRequest>
{
    public UpdateOrderStatusRequestValidator()
    {
        RuleFor(x => x.Status).IsInEnum().WithMessage("Invalid order status.");
    }
}
