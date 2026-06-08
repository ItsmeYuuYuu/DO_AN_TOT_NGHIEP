using System.Threading.Tasks;

namespace ECommerceBackend.Services.Chat
{
    public interface IAiProvider
    {
        Task<string> GetResponseAsync(
            AiConversationRequest request,
            CancellationToken cancellationToken = default);
    }
}
