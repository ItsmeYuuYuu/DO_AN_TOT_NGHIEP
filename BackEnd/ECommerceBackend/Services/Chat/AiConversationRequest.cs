namespace ECommerceBackend.Services.Chat;

public sealed record AiConversationMessage(string Role, string Content);

public sealed record AiConversationRequest(
    int SessionId,
    string UserMessage,
    IReadOnlyList<AiConversationMessage> History);
