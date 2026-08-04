using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace DineFlow.Infrastructure.Persistence.Converters;

/// <summary>
/// SQL Server returns DateTime values without timezone info (Kind = Unspecified).
/// This converter stamps them as Utc on read so System.Text.Json serializes with 'Z'.
/// </summary>
public sealed class DateTimeUtcConverter : ValueConverter<DateTime, DateTime>
{
    public DateTimeUtcConverter()
        : base(
            v => v,
            v => DateTime.SpecifyKind(v, DateTimeKind.Utc)) { }
}
