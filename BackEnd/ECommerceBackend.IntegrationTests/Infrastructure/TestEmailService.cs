using System.Collections.Concurrent;
using ECommerceBackend.Models;
using ECommerceBackend.Services.Email;

namespace ECommerceBackend.IntegrationTests.Infrastructure;

public sealed class TestEmailService : IEmailService
{
    private readonly ConcurrentDictionary<string, string> _passwordResetCodes = new();

    public bool IsConfigured => true;

    public bool RequireRegistrationOtp => false;

    public Task SendRegistrationOtpAsync(string email, string code, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;

    public Task SendPasswordResetOtpAsync(string email, string code, CancellationToken cancellationToken = default)
    {
        _passwordResetCodes[email.Trim().ToLowerInvariant()] = code;
        return Task.CompletedTask;
    }

    public string GetPasswordResetCode(string email) =>
        _passwordResetCodes.TryGetValue(email.Trim().ToLowerInvariant(), out var code)
            ? code
            : throw new InvalidOperationException($"No password reset code was sent to {email}.");

    public Task SendTestEmailAsync(string email, CancellationToken cancellationToken = default) => Task.CompletedTask;

    public Task SendOrderCreatedAsync(Order order, CancellationToken cancellationToken = default) => Task.CompletedTask;

    public Task SendPaymentUpdatedAsync(Order order, CancellationToken cancellationToken = default) => Task.CompletedTask;

    public Task SendOrderStatusUpdatedAsync(Order order, CancellationToken cancellationToken = default) => Task.CompletedTask;
}
