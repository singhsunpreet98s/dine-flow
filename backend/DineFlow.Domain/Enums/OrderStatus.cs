namespace DineFlow.Domain.Enums;

public enum OrderStatus
{
    Placed,
    SentToKitchen,
    Preparing,
    OutOfStock,
    Prepared,
    Served,
    Billed,
    Paid,
    Closed
}
