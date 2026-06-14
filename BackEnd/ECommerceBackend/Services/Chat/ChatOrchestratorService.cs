using System;
using System.Threading.Tasks;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Chats;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Linq;

namespace ECommerceBackend.Services.Chat
{
    public class ChatOrchestratorService : IChatOrchestratorService
    {
        private readonly ECommerceContext _context;
        private readonly IAiProvider _aiProvider;
        private readonly AiAssistantOptions _options;

        public ChatOrchestratorService(
            ECommerceContext context,
            IAiProvider aiProvider,
            IOptions<AiAssistantOptions> options)
        {
            _context = context;
            _aiProvider = aiProvider;
            _options = options.Value;
        }

        public async Task<ChatMessageDto> ProcessUserMessageAsync(Chatsession session, string content)
        {
            var userMessage = new Chatmessage
            {
                Sessionid = session.Sessionid,
                Sendertype = "user",
                Messagecontent = content.Trim(),
                Sentat = DateTime.Now
            };
            _context.Chatmessages.Add(userMessage);
            await _context.SaveChangesAsync();

            var historyMessages = await _context.Chatmessages
                .AsNoTracking()
                .Include(message => message.Chatproductrecommendations)
                .Where(message =>
                    message.Sessionid == session.Sessionid &&
                    message.Messageid != userMessage.Messageid &&
                    (message.Sendertype == "user" || message.Sendertype == "assistant"))
                .OrderByDescending(message => message.Sentat)
                .Take(Math.Clamp(_options.MaxHistoryMessages, 1, 30))
                .OrderBy(message => message.Sentat)
                .ToListAsync();
            var history = historyMessages
                .Select(message => new AiConversationMessage(
                    message.Sendertype == "assistant" ? "assistant" : "user",
                    message.Messagecontent,
                    message.Responsetype,
                    message.Chatproductrecommendations
                        .Select(item => item.Productid)
                        .Distinct()
                        .ToList()))
                .ToList();

            var aiResponse = await _aiProvider.GetResponseAsync(
                new AiConversationRequest(
                    session.Sessionid,
                    userMessage.Messagecontent,
                    history));

            var assistantMessage = new Chatmessage
            {
                Sessionid = session.Sessionid,
                Sendertype = "assistant",
                Messagecontent = aiResponse.Text,
                Responsetype = aiResponse.ResponseType,
                Quickreplies = ChatResponseMetadata.SerializeQuickReplies(aiResponse.QuickReplies),
                Sentat = DateTime.Now
            };
            var rank = 1;
            foreach (var recommendation in aiResponse.Recommendations)
            {
                assistantMessage.Chatproductrecommendations.Add(new Chatproductrecommendation
                {
                    Productid = recommendation.ProductId,
                    Variantid = recommendation.VariantId,
                    Rank = rank++,
                    Createdat = DateTime.Now
                });
            }
            _context.Chatmessages.Add(assistantMessage);

            session.Endtime = DateTime.Now;
            _context.Chatsessions.Update(session);
            await _context.SaveChangesAsync();

            return await _context.Chatmessages
                .AsNoTracking()
                .Where(message => message.Messageid == assistantMessage.Messageid)
                .Select(message => new ChatMessageDto(
                    message.Messageid,
                    message.Sessionid,
                    message.Sendertype,
                    message.Messagecontent,
                    message.Sentat,
                    message.Chatproductrecommendations
                        .OrderBy(item => item.Rank)
                        .Select(item => new ChatRecommendationDto(
                            item.Recommendationid,
                            item.Productid,
                            item.Variantid,
                            item.Product.Productname,
                            item.Variant.Condition + " - " + (item.Variant.Sku ?? string.Empty),
                            item.Variant.Sku ?? string.Empty,
                            item.Variant.Productimages
                                .OrderByDescending(image => image.Ismain == true)
                                .ThenBy(image => image.Imageid)
                                .Select(image => image.Imageurl)
                                .FirstOrDefault() ?? string.Empty,
                            item.Variant.Saleprice ?? item.Variant.Baseprice,
                            item.Variant.Baseprice,
                            item.Variant.Inventoryitems.Count(inventory => inventory.Status == "InStock"),
                            item.Variant.Condition,
                            item.Rank,
                            item.Addedtocartat,
                            item.Orderedat,
                            item.Orderid,
                            item.Product.Brand != null
                                ? item.Product.Brand.Brandname
                                : "Chưa xác định",
                            item.Variant.Specifications ?? "{}"))
                        .ToList(),
                    message.Responsetype,
                    ChatResponseMetadata.DeserializeQuickReplies(message.Quickreplies)))
                .SingleAsync();
        }
    }
}
