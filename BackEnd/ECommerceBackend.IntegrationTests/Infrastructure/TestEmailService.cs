using System.Collections.Concurrent;
using ECommerceBackend.Models;
using ECommerceBackend.Services.Email;

namespace ECommerceBackend.IntegrationTests.Infrastructure;

public sealed class TestEmailService : IEmailService
{
    private readonly ConcurrentDictionary<string, string> _passwordResetCodes = new();
    private readonly ConcurrentQueue<EmailEvent> _events = new();

    public IReadOnlyCollection<EmailEvent> Events => _events.ToArray();

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

    public Task SendOrderCreatedAsync(Order order, CancellationToken cancellationToken = default)
    {
        _events.Enqueue(new EmailEvent("OrderCreated", order.Orderid, null));
        return Task.CompletedTask;
    }

    public Task SendPaymentUpdatedAsync(Order order, CancellationToken cancellationToken = default)
    {
        _events.Enqueue(new EmailEvent("PaymentUpdated", order.Orderid, order.Paymentstatus));
        return Task.CompletedTask;
    }

    public Task SendOrderStatusUpdatedAsync(Order order, CancellationToken cancellationToken = default)
    {
        _events.Enqueue(new EmailEvent("OrderStatusUpdated", order.Orderid, order.Orderstatus));
        return Task.CompletedTask;
    }

    public Task SendShipmentStatusUpdatedAsync(
        Order order,
        Shipment shipment,
        CancellationToken cancellationToken = default)
    {
        _events.Enqueue(new EmailEvent("ShipmentStatusUpdated", order.Orderid, shipment.Status));
        return Task.CompletedTask;
    }
}

public sealed record EmailEvent(string Type, int OrderId, string? Status);
