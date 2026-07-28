using System.Net;
using System.Text.Json;
using ECommerceBackend.IntegrationTests.Infrastructure;

namespace ECommerceBackend.IntegrationTests;

public sealed class StaffSingleSessionTests : IClassFixture<IntegrationTestFactory>
{
    private readonly IntegrationTestFactory _factory;

    public StaffSingleSessionTests(IntegrationTestFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task New_Staff_Login_Invalidates_Previous_Device()
    {
        using var firstDevice = await _factory.CreateAuthenticatedClientAsync("it_admin");
        var beforeReplacement = await firstDevice.GetAsync("/api/Auth/me");
        Assert.Equal(HttpStatusCode.OK, beforeReplacement.StatusCode);

        using var secondDevice = await _factory.CreateAuthenticatedClientAsync("it_admin");

        var oldSession = await firstDevice.GetAsync("/api/Auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, oldSession.StatusCode);

        using var payload = JsonDocument.Parse(await oldSession.Content.ReadAsStringAsync());
        Assert.Equal(
            "STAFF_SESSION_REPLACED",
            payload.RootElement.GetProperty("code").GetString());

        var currentSession = await secondDevice.GetAsync("/api/Auth/me");
        Assert.Equal(HttpStatusCode.OK, currentSession.StatusCode);
    }

    [Fact]
    public async Task Customer_Can_Keep_Multiple_Active_Devices()
    {
        using var firstDevice = await _factory.CreateAuthenticatedClientAsync("it_customer_a");
        using var secondDevice = await _factory.CreateAuthenticatedClientAsync("it_customer_a");

        var firstSession = await firstDevice.GetAsync("/api/Auth/me");
        var secondSession = await secondDevice.GetAsync("/api/Auth/me");

        Assert.Equal(HttpStatusCode.OK, firstSession.StatusCode);
        Assert.Equal(HttpStatusCode.OK, secondSession.StatusCode);
    }
}
