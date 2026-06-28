namespace ECommerceBackend.Services.Chat;

public sealed record ChatTypingStatusDto(bool UserTyping, bool ConsultantTyping);

public interface IChatTypingService
{
    Task SetTypingAsync(int sessionId, string actor, CancellationToken cancellationToken = default);

    Task<ChatTypingStatusDto> GetStatusAsync(int sessionId, CancellationToken cancellationToken = default);
}
