using System;
using System.Threading.Tasks;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Chats;
using Microsoft.EntityFrameworkCore;
using System.Linq;

namespace ECommerceBackend.Services.Chat
{
    public class ChatOrchestratorService : IChatOrchestratorService
    {
        private readonly ECommerceContext _context;
        private readonly IAiProvider _aiProvider;

        public ChatOrchestratorService(ECommerceContext context, IAiProvider aiProvider)
        {
            _context = context;
            _aiProvider = aiProvider;
        }

        public async Task<ChatMessageDto> ProcessUserMessageAsync(Chatsession session, string content)
        {
            // 1. Transaction to save both user and assistant messages safely
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 2. Save user message
                var userMessage = new Chatmessage
                {
                    Sessionid = session.Sessionid,
                    Sendertype = "user",
                    Messagecontent = content,
                    Sentat = DateTime.UtcNow
                };
                _context.Chatmessages.Add(userMessage);
                await _context.SaveChangesAsync();

                // 3. Get AI Response
                var aiResponseText = await _aiProvider.GetResponseAsync(content);

                // 4. Save assistant message
                var assistantMessage = new Chatmessage
                {
                    Sessionid = session.Sessionid,
                    Sendertype = "assistant",
                    Messagecontent = aiResponseText,
                    Sentat = DateTime.UtcNow
                };
                _context.Chatmessages.Add(assistantMessage);

                // Update session time
                session.Endtime = DateTime.UtcNow;
                _context.Chatsessions.Update(session);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return new ChatMessageDto(
                    assistantMessage.Messageid,
                    assistantMessage.Sessionid,
                    assistantMessage.Sendertype,
                    assistantMessage.Messagecontent,
                    assistantMessage.Sentat
                );
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
    }
}
