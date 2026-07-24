using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using ECommerceBackend.Time;

namespace ECommerceBackend.Serialization;

/// <summary>
/// PostgreSQL currently stores timestamps without a time-zone. The application
/// treats those values as UTC and always emits an explicit UTC offset so clients
/// do not mistake them for browser-local time.
/// </summary>
public sealed class UtcDateTimeJsonConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType != JsonTokenType.String)
        {
            throw new JsonException("Giá trị thời gian phải là chuỗi ISO-8601.");
        }

        var rawValue = reader.GetString();
        if (string.IsNullOrWhiteSpace(rawValue) ||
            !DateTime.TryParse(rawValue, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var value))
        {
            throw new JsonException("Giá trị thời gian không hợp lệ.");
        }

        return value.Kind switch
        {
            DateTimeKind.Utc => value,
                DateTimeKind.Local => value.ToUniversalTime(),
                _ => TimeZoneInfo.ConvertTimeToUtc(
                    DateTime.SpecifyKind(value, DateTimeKind.Unspecified),
                    VietnamTime.Zone)
        };
    }

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
    {
        var utcValue = value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            // Values read from PostgreSQL timestamp-without-time-zone lose their
            // DateTimeKind even though the application stores them as UTC.
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };

        writer.WriteStringValue(utcValue);
    }
}
