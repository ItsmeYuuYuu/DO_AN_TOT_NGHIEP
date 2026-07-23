using ECommerceBackend.Models;

namespace ECommerceBackend.Services.Email;

public interface IEmailService
{
    bool IsConfigured { get; }

    bool RequireRegistrationOtp { get; }

    Task SendRegistrationOtpAsync(string email, string code, CancellationToken cancellationToken = default);

    Task SendPasswordResetOtpAsync(string email, string code, CancellationToken cancellationToken = default);

    Task SendTestEmailAsync(string email, CancellationToken cancellationToken = default);

    Task SendOrderCreatedAsync(Order order, CancellationToken cancellationToken = default);

    Task SendPaymentUpdatedAsync(Order order, CancellationToken cancellationToken = default);

    Task SendOrderStatusUpdatedAsync(Order order, CancellationToken cancellationToken = default);
}
