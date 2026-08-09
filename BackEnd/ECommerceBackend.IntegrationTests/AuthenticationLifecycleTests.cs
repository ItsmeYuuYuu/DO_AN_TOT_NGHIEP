using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ECommerceBackend.DTOs.Auth;
using ECommerceBackend.IntegrationTests.Infrastructure;

namespace ECommerceBackend.IntegrationTests;

public sealed class AuthenticationLifecycleTests : IClassFixture<IntegrationTestFactory>
{
    private readonly IntegrationTestFactory _factory;

    public AuthenticationLifecycleTests(IntegrationTestFactory factory) => _factory = factory;

    [Fact]
    public async Task Login_Refresh_Rotates_HttpOnly_Cookie_And_Logout_Revokes_It()
    {
        using var client = _factory.CreateClient();
        var loginResponse = await client.PostAsJsonAsync("/api/Auth/login", new
        {
            username = "it_customer_a",
            password = "Integration@123"
        });
        var login = await loginResponse.Content.ReadFromJsonAsync<LoginResponseDto>();

        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
        var loginCookie = loginResponse.Headers.GetValues("Set-Cookie").Single(value => value.StartsWith("ec_refresh_token="));
        Assert.Contains(loginResponse.Headers.GetValues("Set-Cookie"), value =>
            value.Contains("ec_refresh_token=", StringComparison.Ordinal) &&
            value.Contains("httponly", StringComparison.OrdinalIgnoreCase));
        client.DefaultRequestHeaders.Add("Cookie", loginCookie.Split(';')[0]);

        var refreshResponse = await client.PostAsJsonAsync("/api/Auth/refresh", new { });
        var refreshed = await refreshResponse.Content.ReadFromJsonAsync<LoginResponseDto>();
        Assert.Equal(HttpStatusCode.OK, refreshResponse.StatusCode);
        Assert.NotEqual(login!.AccessToken, refreshed!.AccessToken);

        var rotatedCookie = refreshResponse.Headers.GetValues("Set-Cookie").Single(value => value.StartsWith("ec_refresh_token="));
        client.DefaultRequestHeaders.Remove("Cookie");
        client.DefaultRequestHeaders.Add("Cookie", rotatedCookie.Split(';')[0]);

        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/Auth/logout", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/Auth/refresh", new { })).StatusCode);
    }

    [Fact]
    public async Task Customer_List_Exposes_Public_Uuid_Instead_Of_Incrementing_Id()
    {
        using var admin = await _factory.CreateAuthenticatedClientAsync("it_admin");
        var response = await admin.GetAsync("/api/Customers?page=1&pageSize=10");
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var id = json.RootElement.GetProperty("items")[0].GetProperty("customerid").GetString();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(Guid.TryParse(id, out _));
    }
}
