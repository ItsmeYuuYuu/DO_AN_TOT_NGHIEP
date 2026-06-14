namespace ECommerceBackend.Services.Chat;

public sealed record AiConversationMessage(
    string Role,
    string Content,
    string? ResponseType = null,
    IReadOnlyList<int>? ProductIds = null);

public sealed record AiConversationRequest(
    int SessionId,
    string UserMessage,
    IReadOnlyList<AiConversationMessage> History);
