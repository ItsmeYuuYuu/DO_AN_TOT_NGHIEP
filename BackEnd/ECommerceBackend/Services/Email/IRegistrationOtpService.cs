namespace ECommerceBackend.Services.Email;

public interface IRegistrationOtpService
{
    Task SendCodeAsync(string email, CancellationToken cancellationToken = default);

    Task<bool> ValidateAsync(string email, string? code, CancellationToken cancellationToken = default);
}
