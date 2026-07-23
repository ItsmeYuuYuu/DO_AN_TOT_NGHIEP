using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;

namespace ECommerceBackend.Services.Email;

public sealed class PasswordResetService : IPasswordResetService
{
    private const string KeyPrefix = "auth:password-reset:";
    private const int MaximumFailedAttempts = 5;
    private static readonly TimeSpan CodeLifetime = TimeSpan.FromMinutes(10);

    private readonly IDistributedCache _cache;
    private readonly IEmailService _emailService;
    private readonly ILogger<PasswordResetService> _logger;
    private readonly byte[] _hashKey;

    public PasswordResetService(
        IDistributedCache cache,
        IEmailService emailService,
        IConfiguration configuration,
        ILogger<PasswordResetService> logger)
    {
        _cache = cache;
        _emailService = emailService;
        _logger = logger;
        var secret = configuration["JwtSettings:SecretKey"]
            ?? throw new InvalidOperationException("JwtSettings:SecretKey is required for password reset codes.");
        _hashKey = Encoding.UTF8.GetBytes(secret);
    }

    public async Task SendCodeAsync(string email, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = Normalize(email);
        var code = RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
        var expiresAt = DateTimeOffset.UtcNow.Add(CodeLifetime);
        var state = new PasswordResetCodeState(
            Hash($"password-reset:{normalizedEmail}:{code}"),
            0,
            expiresAt);

        await _cache.SetStringAsync(
            BuildKey(normalizedEmail),
            JsonSerializer.Serialize(state),
            new DistributedCacheEntryOptions { AbsoluteExpiration = expiresAt },
            cancellationToken);

        await _emailService.SendPasswordResetOtpAsync(normalizedEmail, code, cancellationToken);
        _logger.LogInformation("Password reset OTP generated for {Email}", normalizedEmail);
    }

    public async Task<bool> ValidateAndConsumeAsync(
        string email,
        string? code,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(code) || code.Trim().Length != 6) return false;

        var normalizedEmail = Normalize(email);
        var key = BuildKey(normalizedEmail);
        var serializedState = await _cache.GetStringAsync(key, cancellationToken);
        if (string.IsNullOrWhiteSpace(serializedState)) return false;

        PasswordResetCodeState? state;
        try
        {
            state = JsonSerializer.Deserialize<PasswordResetCodeState>(serializedState);
        }
        catch (JsonException)
        {
            await _cache.RemoveAsync(key, cancellationToken);
            return false;
        }

        if (state == null || state.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            await _cache.RemoveAsync(key, cancellationToken);
            return false;
        }

        var candidateHash = Hash($"password-reset:{normalizedEmail}:{code.Trim()}");
        var isValid = CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(state.CodeHash),
            Encoding.UTF8.GetBytes(candidateHash));

        if (isValid)
        {
            await _cache.RemoveAsync(key, cancellationToken);
            return true;
        }

        var failedAttempts = state.FailedAttempts + 1;
        if (failedAttempts >= MaximumFailedAttempts)
        {
            await _cache.RemoveAsync(key, cancellationToken);
            _logger.LogWarning("Password reset OTP locked after repeated failures for {Email}", normalizedEmail);
            return false;
        }

        await _cache.SetStringAsync(
            key,
            JsonSerializer.Serialize(state with { FailedAttempts = failedAttempts }),
            new DistributedCacheEntryOptions { AbsoluteExpiration = state.ExpiresAt },
            cancellationToken);
        return false;
    }

    private static string BuildKey(string email) => $"{KeyPrefix}{email}";

    private static string Normalize(string email) => email.Trim().ToLowerInvariant();

    private string Hash(string value)
    {
        var bytes = HMACSHA256.HashData(_hashKey, Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(bytes);
    }

    private sealed record PasswordResetCodeState(
        string CodeHash,
        int FailedAttempts,
        DateTimeOffset ExpiresAt);
}
