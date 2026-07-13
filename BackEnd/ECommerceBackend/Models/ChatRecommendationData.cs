using System.Text.Json;

namespace ECommerceBackend.Models;

public sealed class ChatRecommendationData
{
    public int Recommendationid { get; set; }
    public int Productid { get; set; }
    public int Variantid { get; set; }
    public int Rank { get; set; }
    public DateTime? Createdat { get; set; }
    public DateTime? Addedtocartat { get; set; }
    public DateTime? Orderedat { get; set; }
    public int? Orderid { get; set; }
}

public static class ChatRecommendationDataSerializer
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public static List<ChatRecommendationData> Deserialize(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<ChatRecommendationData>>(json, Options) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    public static string Serialize(IReadOnlyCollection<ChatRecommendationData> recommendations) =>
        JsonSerializer.Serialize(recommendations, Options);
}
