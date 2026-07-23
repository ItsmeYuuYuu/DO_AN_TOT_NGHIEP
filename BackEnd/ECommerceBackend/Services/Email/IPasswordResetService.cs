namespace ECommerceBackend.Services.Email;

public interface IPasswordResetService
{
    Task SendCodeAsync(string email, CancellationToken cancellationToken = default);

    Task<bool> ValidateAndConsumeAsync(
        string email,
        string? code,
        CancellationToken cancellationToken = default);
}
