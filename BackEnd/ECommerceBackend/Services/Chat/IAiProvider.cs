using System.Threading.Tasks;

namespace ECommerceBackend.Services.Chat
{
    public sealed record AiAssistantResponse(
        string Text,
        IReadOnlyList<ProductConsultationResult> Recommendations,
        string ResponseType = ChatResponseTypes.Text,
        IReadOnlyList<string>? QuickReplies = null);

    public interface IAiProvider
    {
        Task<AiAssistantResponse> GetResponseAsync(
            AiConversationRequest request,
            CancellationToken cancellationToken = default);
    }
}
