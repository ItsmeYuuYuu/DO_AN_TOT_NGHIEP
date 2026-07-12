using System;
using System.Threading.Tasks;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Chats;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Linq;

namespace ECommerceBackend.Services.Chat
{
    public class ChatOrchestratorService : IChatOrchestratorService { public System.Threading.Tasks.Task<ChatMessageDto> ProcessUserMessageAsync(Chatsession session, string userMessage) { return System.Threading.Tasks.Task.FromResult(new ChatMessageDto(0, 0, "", "", DateTime.Now, null, null, null)); } }
}
