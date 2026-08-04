using DineFlow.Application.DTOs.Orders;
using DineFlow.Domain.Enums;
using FluentValidation;

namespace DineFlow.Application.Validators;

public class UpdateOrderStatusRequestValidator : AbstractValidator<UpdateOrderStatusRequest>
{
    public UpdateOrderStatusRequestValidator()
    {
        RuleFor(x => x.Status).IsInEnum().WithMessage("Invalid order status.");

        When(x => x.Status == OrderStatus.Paid, () =>
        {
            RuleFor(x => x.PaymentMode)
                .NotNull()
                .WithMessage("PaymentMode is required when setting status to Paid.");
        });

        RuleFor(x => x.Note)
            .MaximumLength(500)
            .When(x => x.Note is not null);
    }
}
