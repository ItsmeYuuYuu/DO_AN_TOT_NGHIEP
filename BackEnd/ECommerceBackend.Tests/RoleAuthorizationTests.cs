using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Headers;

namespace ECommerceBackend.Tests;

public class RoleAuthorizationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public RoleAuthorizationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private HttpClient CreateAuthenticatedClient(string role)
    {
        var client = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                services.AddAuthentication("TestScheme")
                    .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                        "TestScheme",
                        _ => { });

                services.PostConfigure<Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerOptions>(
                    Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme,
                    options => options.ForwardDefaultSelector = _ => "TestScheme");
            });
        }).CreateClient();

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestScheme");
        client.DefaultRequestHeaders.Add("X-Test-Role", role);
        client.DefaultRequestHeaders.Add("X-Test-UserId", "1");
        return client;
    }

    public static TheoryData<string, HttpMethod, string, HttpStatusCode> AllowedRoleRequests => new()
    {
        { "Admin", HttpMethod.Get, "/api/AuditLogs", HttpStatusCode.OK },
        { "Manager", HttpMethod.Get, "/api/Dashboard/today-results", HttpStatusCode.OK },
        { "Sales", HttpMethod.Get, "/api/Orders", HttpStatusCode.OK },
        { "Warehouse", HttpMethod.Get, "/api/Inventory", HttpStatusCode.OK },
        { "Warranty", HttpMethod.Get, "/api/Warranties", HttpStatusCode.OK },
        { "Content", HttpMethod.Delete, "/api/ProductImages/uploaded/role-matrix-unused.jpg", HttpStatusCode.NoContent },
        { "Consultant", HttpMethod.Get, "/api/ChatSessions/handoffs", HttpStatusCode.OK },
        { "Consultant", HttpMethod.Get, "/api/Customers", HttpStatusCode.OK },
        { "Warehouse", HttpMethod.Get, "/api/Shipments", HttpStatusCode.OK },
        { "Manager", HttpMethod.Get, "/api/ReturnRequests", HttpStatusCode.OK },
        { "Admin", HttpMethod.Get, "/api/ChatSessions/recommendation-metrics", HttpStatusCode.OK },
        { "Customer", HttpMethod.Get, "/api/ReturnRequests/mine", HttpStatusCode.OK }
    };

    [Theory]
    [MemberData(nameof(AllowedRoleRequests))]
    public async Task Role_CanCallItsAssignedApi(
        string role,
        HttpMethod method,
        string path,
        HttpStatusCode expectedStatus)
    {
        using var client = CreateAuthenticatedClient(role);
        using var request = new HttpRequestMessage(method, path);

        var response = await client.SendAsync(request);

        Assert.Equal(expectedStatus, response.StatusCode);
    }

    public static TheoryData<string, HttpMethod, string> ForbiddenRoleRequests => new()
    {
        { "Manager", HttpMethod.Get, "/api/Users" },
        { "Sales", HttpMethod.Get, "/api/Inventory" },
        { "Warehouse", HttpMethod.Get, "/api/Orders" },
        { "Warranty", HttpMethod.Get, "/api/Dashboard/today-results" },
        { "Content", HttpMethod.Get, "/api/Orders" },
        { "Consultant", HttpMethod.Get, "/api/Dashboard/today-results" },
        { "Customer", HttpMethod.Get, "/api/Dashboard/today-results" },
        { "Sales", HttpMethod.Get, "/api/Warranties" },
        { "Warehouse", HttpMethod.Get, "/api/Warranties" },
        { "Customer", HttpMethod.Get, "/api/Orders" },
        { "Content", HttpMethod.Get, "/api/ReturnRequests" },
        { "Warranty", HttpMethod.Get, "/api/ReturnRequests" },
        { "Consultant", HttpMethod.Get, "/api/ReturnRequests" },
        { "Content", HttpMethod.Get, "/api/Inventory" },
        { "Warranty", HttpMethod.Get, "/api/Shipments" },
        { "Warehouse", HttpMethod.Get, "/api/ChatSessions/handoffs" },
        { "Sales", HttpMethod.Get, "/api/ChatSessions/handoffs" },
        { "Consultant", HttpMethod.Get, "/api/Users" },
        { "Customer", HttpMethod.Get, "/api/ChatSessions/recommendation-metrics" }
    };

    [Theory]
    [MemberData(nameof(ForbiddenRoleRequests))]
    public async Task Role_CannotCallApiOutsideItsDepartment(
        string role,
        HttpMethod method,
        string path)
    {
        using var client = CreateAuthenticatedClient(role);
        using var request = new HttpRequestMessage(method, path);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task ProtectedApi_WithoutAuthentication_ReturnsUnauthorized()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/Orders");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
