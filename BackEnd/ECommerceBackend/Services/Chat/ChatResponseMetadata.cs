using System.Text.Json;

namespace ECommerceBackend.Services.Chat;

public static class ChatResponseTypes
{
    public const string Text = "text";
    public const string Clarification = "clarification";
    public const string Recommendation = "recommendation";
    public const string Comparison = "comparison";
}

public static class ChatResponseMetadata
{
    public static string? SerializeQuickReplies(IReadOnlyList<string>? quickReplies) =>
        quickReplies is { Count: > 0 }
            ? JsonSerializer.Serialize(quickReplies)
            : null;

    public static IReadOnlyList<string> DeserializeQuickReplies(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return Array.Empty<string>();

        try
        {
            return JsonSerializer.Deserialize<List<string>>(json)
                   ?? new List<string>();
        }
        catch (JsonException)
        {
            return Array.Empty<string>();
        }
    }
}
