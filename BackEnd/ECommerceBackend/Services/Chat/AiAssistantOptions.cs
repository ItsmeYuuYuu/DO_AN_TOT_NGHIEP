namespace ECommerceBackend.Services.Chat;

public sealed class AiAssistantOptions
{
    public const string SectionName = "AiAssistant";

    public string Provider { get; set; } = "Catalog";

    public string BaseUrl { get; set; } = string.Empty;

    public string ApiKey { get; set; } = string.Empty;

    public string Model { get; set; } = string.Empty;

    public int TimeoutSeconds { get; set; } = 60;

    public int MaxHistoryMessages { get; set; } = 12;

    public int MaxRetrievedVariants { get; set; } = 5;

    public bool UseLanguageModel =>
        Provider.Equals("OpenAICompatible", StringComparison.OrdinalIgnoreCase) &&
        !string.IsNullOrWhiteSpace(BaseUrl) &&
        !string.IsNullOrWhiteSpace(Model);
}
