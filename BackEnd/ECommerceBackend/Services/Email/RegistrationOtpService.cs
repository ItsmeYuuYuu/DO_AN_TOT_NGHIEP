using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Caching.Distributed;

namespace ECommerceBackend.Services.Email;

public sealed class RegistrationOtpService : IRegistrationOtpService
{
    private const string KeyPrefix = "auth:registration-otp:";
    private readonly IDistributedCache _cache;
    private readonly IEmailService _emailService;
    private readonly ILogger<RegistrationOtpService> _logger;

    public RegistrationOtpService(
        IDistributedCache cache,
        IEmailService emailService,
        ILogger<RegistrationOtpService> logger)
    {
        _cache = cache;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task SendCodeAsync(string email, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = Normalize(email);
        var code = RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
        var hash = Hash($"{normalizedEmail}:{code}");

        await _cache.SetStringAsync(
            BuildKey(normalizedEmail),
            hash,
            new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
            },
            cancellationToken);

        await _emailService.SendRegistrationOtpAsync(normalizedEmail, code, cancellationToken);
        _logger.LogInformation("Registration OTP generated for {Email}", normalizedEmail);
    }

    public async Task<bool> ValidateAsync(string email, string? code, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(code)) return false;

        var normalizedEmail = Normalize(email);
        var cachedHash = await _cache.GetStringAsync(BuildKey(normalizedEmail), cancellationToken);
        if (string.IsNullOrWhiteSpace(cachedHash)) return false;

        var isValid = CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(cachedHash),
            Encoding.UTF8.GetBytes(Hash($"{normalizedEmail}:{code.Trim()}")));

        if (isValid)
        {
            await _cache.RemoveAsync(BuildKey(normalizedEmail), cancellationToken);
        }

        return isValid;
    }

    private static string BuildKey(string email) => $"{KeyPrefix}{email}";

    private static string Normalize(string email) => email.Trim().ToLowerInvariant();

    private static string Hash(string value)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(bytes);
    }
}
