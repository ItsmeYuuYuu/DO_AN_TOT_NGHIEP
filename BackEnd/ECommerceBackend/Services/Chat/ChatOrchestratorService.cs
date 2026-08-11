using System.Text.Json;
using ECommerceBackend.DTOs.Chats;
using ECommerceBackend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using ECommerceBackend.Services.Security;

namespace ECommerceBackend.Services.Chat;

public sealed class ChatOrchestratorService : IChatOrchestratorService
{
    private readonly ECommerceContext _context;
    private readonly IAiProvider _aiProvider;
    private readonly AiAssistantOptions _options;
    private readonly ISensitiveDataProtectionService _sensitiveDataProtection;

    public ChatOrchestratorService(
        ECommerceContext context,
        IAiProvider aiProvider,
        IOptions<AiAssistantOptions> options,
        ISensitiveDataProtectionService sensitiveDataProtection)
    {
        _context = context;
        _aiProvider = aiProvider;
        _options = options.Value;
        _sensitiveDataProtection = sensitiveDataProtection;
    }

    public async Task<ChatMessageDto> ProcessUserMessageAsync(Chatsession session, string content)
    {
        var safeContent = _sensitiveDataProtection.Sanitize(content.Trim()).SanitizedText;
        var userMessage = new Chatmessage
        {
            Sessionid = session.Sessionid,
            Sendertype = "user",
            Messagecontent = safeContent,
            Sentat = DateTime.UtcNow
        };
        _context.Chatmessages.Add(userMessage);
        await _context.SaveChangesAsync();

        var historyMessages = await _context.Chatmessages
            .AsNoTracking()
            .Where(message =>
                message.Sessionid == session.Sessionid &&
                message.Messageid != userMessage.Messageid &&
                (message.Sendertype == "user" || message.Sendertype == "assistant"))
            .OrderByDescending(message => message.Sentat)
            .Take(Math.Clamp(_options.MaxHistoryMessages, 1, 30))
            .OrderBy(message => message.Sentat)
            .ToListAsync();

        var history = historyMessages.Select(message => new AiConversationMessage(
            message.Sendertype == "assistant" ? "assistant" : "user",
            _sensitiveDataProtection.Sanitize(message.Messagecontent).SanitizedText,
            message.Responsetype,
            ChatRecommendationDataSerializer.Deserialize(message.Recommendations)
                .Select(item => item.Productid)
                .Distinct()
                .ToList())).ToList();

        var aiResponse = await _aiProvider.GetResponseAsync(new AiConversationRequest(
            session.Sessionid,
            userMessage.Messagecontent,
            history));
        var normalizedRecommendations = aiResponse.Recommendations
            .GroupBy(item => item.ProductId)
            .Select(group => group.First())
            .ToList();

        var safeAssistantText = _sensitiveDataProtection.Sanitize(aiResponse.Text).SanitizedText;
        var assistantMessage = new Chatmessage
        {
            Sessionid = session.Sessionid,
            Sendertype = "assistant",
            Messagecontent = safeAssistantText,
            Responsetype = aiResponse.ResponseType,
            Quickreplies = ChatResponseMetadata.SerializeQuickReplies(aiResponse.QuickReplies),
            Sentat = DateTime.UtcNow
        };
        _context.Chatmessages.Add(assistantMessage);
        await _context.SaveChangesAsync();

        var recommendationData = normalizedRecommendations
            .Select((item, index) => new ChatRecommendationData
            {
                Recommendationid = checked(assistantMessage.Messageid * 100 + index + 1),
                Productid = item.ProductId,
                Variantid = item.VariantId,
                Rank = index + 1,
                Createdat = DateTime.UtcNow
            })
            .ToList();
        assistantMessage.Recommendations = recommendationData.Count == 0
            ? null
            : ChatRecommendationDataSerializer.Serialize(recommendationData);
        session.Endtime = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var cards = normalizedRecommendations.Select((item, index) => new ChatRecommendationDto(
            recommendationData[index].Recommendationid,
            item.ProductId,
            item.ProductSlug,
            item.VariantId,
            item.ProductName,
            $"{item.Condition} - {item.Sku}".Trim(' ', '-'),
            item.Sku,
            item.ImageUrl,
            item.Price,
            item.BasePrice,
            item.Stock,
            item.Condition,
            index + 1,
            null,
            null,
            null,
            item.Brand,
            JsonSerializer.Serialize(item.Specifications))).ToList();

        return new ChatMessageDto(
            assistantMessage.Messageid,
            assistantMessage.Sessionid,
            assistantMessage.Sendertype,
            assistantMessage.Messagecontent,
            assistantMessage.Sentat,
            cards,
            assistantMessage.Responsetype,
            ChatResponseMetadata.DeserializeQuickReplies(assistantMessage.Quickreplies));
    }
}
