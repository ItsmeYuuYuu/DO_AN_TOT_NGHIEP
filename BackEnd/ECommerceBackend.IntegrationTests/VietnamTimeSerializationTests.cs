using System.Text.Json;
using ECommerceBackend.Serialization;

namespace ECommerceBackend.IntegrationTests;

public sealed class VietnamTimeSerializationTests
{
    private static JsonSerializerOptions CreateOptions()
    {
        var options = new JsonSerializerOptions();
        options.Converters.Add(new UtcDateTimeJsonConverter());
        return options;
    }

    [Fact]
    public void DatabaseTimestampWithoutKind_IsSerializedAsExplicitUtc()
    {
        var databaseValue = new DateTime(2026, 7, 24, 5, 30, 0, DateTimeKind.Unspecified);

        var json = JsonSerializer.Serialize(databaseValue, CreateOptions());
        var serializedValue = JsonSerializer.Deserialize<string>(json);

        Assert.NotNull(serializedValue);
        Assert.EndsWith("Z", serializedValue, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(
            new DateTimeOffset(2026, 7, 24, 5, 30, 0, TimeSpan.Zero),
            DateTimeOffset.Parse(serializedValue!));
    }

    [Fact]
    public void VietnamLocalInputWithoutOffset_IsConvertedToUtc()
    {
        const string json = "\"2026-07-24T12:30:00\"";

        var result = JsonSerializer.Deserialize<DateTime>(json, CreateOptions());

        Assert.Equal(DateTimeKind.Utc, result.Kind);
        Assert.Equal(new DateTime(2026, 7, 24, 5, 30, 0, DateTimeKind.Utc), result);
    }
}
