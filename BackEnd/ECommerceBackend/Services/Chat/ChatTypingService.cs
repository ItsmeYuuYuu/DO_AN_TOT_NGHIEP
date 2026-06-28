using Microsoft.Extensions.Caching.Distributed;

namespace ECommerceBackend.Services.Chat;

public sealed class ChatTypingService : IChatTypingService
{
    private readonly IDistributedCache _cache;

    public ChatTypingService(IDistributedCache cache)
    {
        _cache = cache;
    }

    public Task SetTypingAsync(int sessionId, string actor, CancellationToken cancellationToken = default)
    {
        var normalizedActor = actor.Equals("consultant", StringComparison.OrdinalIgnoreCase)
            ? "consultant"
            : "user";

        return _cache.SetStringAsync(
            BuildKey(sessionId, normalizedActor),
            DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString(),
            new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(8)
            },
            cancellationToken);
    }

    public async Task<ChatTypingStatusDto> GetStatusAsync(int sessionId, CancellationToken cancellationToken = default)
    {
        var userTyping = !string.IsNullOrWhiteSpace(
            await _cache.GetStringAsync(BuildKey(sessionId, "user"), cancellationToken));
        var consultantTyping = !string.IsNullOrWhiteSpace(
            await _cache.GetStringAsync(BuildKey(sessionId, "consultant"), cancellationToken));

        return new ChatTypingStatusDto(userTyping, consultantTyping);
    }

    private static string BuildKey(int sessionId, string actor) => $"chat:typing:{sessionId}:{actor}";
}
