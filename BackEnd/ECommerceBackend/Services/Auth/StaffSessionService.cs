using Microsoft.Extensions.Caching.Distributed;

namespace ECommerceBackend.Services.Auth;

public static class StaffSessionPolicy
{
    private static readonly HashSet<string> SingleSessionRoles = new(
        new[] { "Admin", "Manager", "Sales", "Warehouse", "Warranty", "Content", "Consultant" },
        StringComparer.OrdinalIgnoreCase);

    public static bool RequiresSingleSession(string? roleName) =>
        !string.IsNullOrWhiteSpace(roleName) && SingleSessionRoles.Contains(roleName);
}

public interface IStaffSessionService
{
    Task ActivateAsync(int userId, string sessionId, TimeSpan lifetime, CancellationToken cancellationToken = default);
    Task<bool> IsActiveAsync(int userId, string sessionId, CancellationToken cancellationToken = default);
    Task RevokeAsync(int userId, string sessionId, CancellationToken cancellationToken = default);
}

public sealed class StaffSessionService : IStaffSessionService
{
    private readonly IDistributedCache _cache;

    public StaffSessionService(IDistributedCache cache)
    {
        _cache = cache;
    }

    public Task ActivateAsync(
        int userId,
        string sessionId,
        TimeSpan lifetime,
        CancellationToken cancellationToken = default)
    {
        return _cache.SetStringAsync(
            GetCacheKey(userId),
            sessionId,
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = lifetime },
            cancellationToken);
    }

    public async Task<bool> IsActiveAsync(
        int userId,
        string sessionId,
        CancellationToken cancellationToken = default)
    {
        var activeSessionId = await _cache.GetStringAsync(GetCacheKey(userId), cancellationToken);
        return !string.IsNullOrWhiteSpace(activeSessionId) &&
               string.Equals(activeSessionId, sessionId, StringComparison.Ordinal);
    }

    public async Task RevokeAsync(
        int userId,
        string sessionId,
        CancellationToken cancellationToken = default)
    {
        var cacheKey = GetCacheKey(userId);
        var activeSessionId = await _cache.GetStringAsync(cacheKey, cancellationToken);

        // A stale token must never revoke a newer login.
        if (string.Equals(activeSessionId, sessionId, StringComparison.Ordinal))
        {
            await _cache.RemoveAsync(cacheKey, cancellationToken);
        }
    }

    private static string GetCacheKey(int userId) => $"auth:staff-session:{userId}";
}
