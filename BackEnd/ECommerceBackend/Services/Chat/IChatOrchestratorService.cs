using System.Threading.Tasks;
using ECommerceBackend.DTOs.Chats;
using ECommerceBackend.Models;

namespace ECommerceBackend.Services.Chat
{
    public interface IChatOrchestratorService
    {
        Task<ChatMessageDto> ProcessUserMessageAsync(Chatsession session, string content);
    }
}
