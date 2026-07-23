using System.Net;
using System.Net.Http.Json;
using ECommerceBackend.DTOs.Auth;
using ECommerceBackend.IntegrationTests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace ECommerceBackend.IntegrationTests;

public sealed class PasswordResetTests : IClassFixture<IntegrationTestFactory>
{
    private const string Email = "it.reset@example.test";
    private readonly IntegrationTestFactory _factory;

    public PasswordResetTests(IntegrationTestFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Password_Reset_Code_Is_One_Time_And_New_Password_Can_Login()
    {
        var requestResponse = await _factory.Client.PostAsJsonAsync(
            "/api/Auth/forgot-password",
            new ForgotPasswordRequestDto(Email));
        Assert.Equal(HttpStatusCode.OK, requestResponse.StatusCode);

        var emailService = _factory.Services.GetRequiredService<TestEmailService>();
        var code = emailService.GetPasswordResetCode(Email);
        Assert.Matches(@"^\d{6}$", code);

        var invalidResponse = await _factory.Client.PostAsJsonAsync(
            "/api/Auth/reset-password",
            new ResetPasswordRequestDto(Email, "000000", "Recovered@123", "Recovered@123"));
        Assert.Equal(HttpStatusCode.BadRequest, invalidResponse.StatusCode);

        var resetResponse = await _factory.Client.PostAsJsonAsync(
            "/api/Auth/reset-password",
            new ResetPasswordRequestDto(Email, code, "Recovered@123", "Recovered@123"));
        Assert.Equal(HttpStatusCode.OK, resetResponse.StatusCode);

        var reusedCodeResponse = await _factory.Client.PostAsJsonAsync(
            "/api/Auth/reset-password",
            new ResetPasswordRequestDto(Email, code, "Another@123", "Another@123"));
        Assert.Equal(HttpStatusCode.BadRequest, reusedCodeResponse.StatusCode);

        var oldPasswordLogin = await _factory.Client.PostAsJsonAsync(
            "/api/Auth/login",
            new LoginRequestDto("it_reset", "Integration@123"));
        var newPasswordLogin = await _factory.Client.PostAsJsonAsync(
            "/api/Auth/login",
            new LoginRequestDto("it_reset", "Recovered@123"));

        Assert.Equal(HttpStatusCode.Unauthorized, oldPasswordLogin.StatusCode);
        Assert.Equal(HttpStatusCode.OK, newPasswordLogin.StatusCode);
    }
}
