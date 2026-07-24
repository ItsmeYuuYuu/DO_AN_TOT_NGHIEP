namespace ECommerceBackend.Time;

public static class VietnamTime
{
    public static TimeZoneInfo Zone { get; } = ResolveTimeZone();

    public static DateTime UtcNow => DateTime.UtcNow;

    public static DateTime Now => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Zone);

    public static DateTime Today => Now.Date;

    public static DateTime FromUtc(DateTime value)
    {
        var utcValue = value.Kind == DateTimeKind.Utc
            ? value
            : DateTime.SpecifyKind(value, DateTimeKind.Utc);

        return TimeZoneInfo.ConvertTimeFromUtc(utcValue, Zone);
    }

    public static DateTime ToUtc(DateTime vietnamValue)
    {
        return TimeZoneInfo.ConvertTimeToUtc(
            DateTime.SpecifyKind(vietnamValue, DateTimeKind.Unspecified),
            Zone);
    }

    public static (DateTime StartUtc, DateTime EndUtc) GetUtcDayRange(DateTime vietnamDate)
    {
        var start = ToUtc(vietnamDate.Date);
        return (start, start.AddDays(1));
    }

    private static TimeZoneInfo ResolveTimeZone()
    {
        foreach (var id in new[] { "Asia/Ho_Chi_Minh", "SE Asia Standard Time" })
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(id);
            }
            catch (TimeZoneNotFoundException)
            {
                // Try the next platform-specific identifier.
            }
            catch (InvalidTimeZoneException)
            {
                // Try the next platform-specific identifier.
            }
        }

        return TimeZoneInfo.CreateCustomTimeZone(
            "Vietnam Standard Time",
            TimeSpan.FromHours(7),
            "Vietnam Standard Time",
            "Vietnam Standard Time");
    }
}
