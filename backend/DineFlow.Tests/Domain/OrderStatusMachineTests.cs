using DineFlow.Domain.Entities;
using DineFlow.Domain.Enums;
using FluentAssertions;

namespace DineFlow.Tests.Domain;

public class OrderStatusMachineTests
{
    [Fact]
    public void TransitionTo_WhenValid_ShouldUpdateStatus()
    {
        var order = new Order();
        order.TransitionTo(OrderStatus.SentToKitchen);
        order.Status.Should().Be(OrderStatus.SentToKitchen);
    }

    [Fact]
    public void TransitionTo_WhenInvalid_ShouldThrow()
    {
        var order = new Order();
        var act = () => order.TransitionTo(OrderStatus.Paid);
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void TransitionTo_WhenClosedOrder_ShouldThrow()
    {
        var order = new Order();
        order.TransitionTo(OrderStatus.SentToKitchen);
        order.TransitionTo(OrderStatus.Preparing);
        order.TransitionTo(OrderStatus.Prepared);
        order.TransitionTo(OrderStatus.Billed);
        order.TransitionTo(OrderStatus.Paid);
        order.TransitionTo(OrderStatus.Closed);

        var act = () => order.TransitionTo(OrderStatus.Placed);
        act.Should().Throw<InvalidOperationException>();
    }
}
