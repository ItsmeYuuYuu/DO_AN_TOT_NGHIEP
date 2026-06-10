using Microsoft.Extensions.Caching.Distributed;

namespace ECommerceBackend.Services.Checkout;

public record CheckoutAbuseResult(bool Allowed, string? Message);

public interface ICheckoutAbuseProtectionService
{
    Task<CheckoutAbuseResult> CheckAsync(HttpContext httpContext, string phone, string? guestToken, bool isGuest);

    Task MarkGuestPendingAsync(string? guestToken, string phone, int orderId);

    Task ReleaseGuestPendingAsync(string? guestToken, string phone);
}

public class CheckoutAbuseProtectionService : ICheckoutAbuseProtectionService
{
    private readonly IDistributedCache _cache;

    public CheckoutAbuseProtectionService(IDistributedCache cache)
    {
        _cache = cache;
    }

    public async Task<CheckoutAbuseResult> CheckAsync(
        HttpContext httpContext,
        string phone,
        string? guestToken,
        bool isGuest)
    {
        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        var ipResult = await IncrementAndCheckAsync(
            $"checkout:ip:{ip}",
            limit: 5,
            window: TimeSpan.FromMinutes(10),
            "Ban tao don qua nhanh. Vui long thu lai sau it phut.");
        if (!ipResult.Allowed) return ipResult;

        var normalizedPhone = Normalize(phone);
        var phoneResult = await IncrementAndCheckAsync(
            $"checkout:phone:{normalizedPhone}",
            limit: 3,
            window: TimeSpan.FromMinutes(30),
            "So dien thoai nay dang tao qua nhieu don trong thoi gian ngan.");
        if (!phoneResult.Allowed) return phoneResult;

        if (isGuest)
        {
            var pendingOrder = await GetFirstExistingAsync(
                PendingKeys(guestToken, normalizedPhone));
            if (!string.IsNullOrWhiteSpace(pendingOrder))
            {
                return new CheckoutAbuseResult(
                    false,
                    "Khach vang lai dang co mot don cho thanh toan. Vui long hoan tat hoac doi het thoi gian giu hang.");
            }
        }

        return new CheckoutAbuseResult(true, null);
    }

    public async Task MarkGuestPendingAsync(string? guestToken, string phone, int orderId)
    {
        var options = new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(15)
        };
        var normalizedPhone = Normalize(phone);
        foreach (var key in PendingKeys(guestToken, normalizedPhone))
        {
            await _cache.SetStringAsync(key, orderId.ToString(), options);
        }
    }

    public async Task ReleaseGuestPendingAsync(string? guestToken, string phone)
    {
        var normalizedPhone = Normalize(phone);
        foreach (var key in PendingKeys(guestToken, normalizedPhone))
        {
            await _cache.RemoveAsync(key);
        }
    }

    private async Task<CheckoutAbuseResult> IncrementAndCheckAsync(
        string key,
        int limit,
        TimeSpan window,
        string message)
    {
        var raw = await _cache.GetStringAsync(key);
        var count = int.TryParse(raw, out var parsed) ? parsed : 0;
        if (count >= limit)
        {
            return new CheckoutAbuseResult(false, message);
        }

        await _cache.SetStringAsync(
            key,
            (count + 1).ToString(),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = window });

        return new CheckoutAbuseResult(true, null);
    }

    private async Task<string?> GetFirstExistingAsync(IEnumerable<string> keys)
    {
        foreach (var key in keys)
        {
            var value = await _cache.GetStringAsync(key);
            if (!string.IsNullOrWhiteSpace(value)) return value;
        }
        return null;
    }

    private static IEnumerable<string> PendingKeys(string? guestToken, string normalizedPhone)
    {
        if (!string.IsNullOrWhiteSpace(guestToken))
        {
            yield return $"checkout:guest-pending:token:{Normalize(guestToken)}";
        }
        yield return $"checkout:guest-pending:phone:{normalizedPhone}";
    }

    private static string Normalize(string value)
    {
        return value.Trim().ToLowerInvariant().Replace(" ", "");
    }
}
