using System.Net;
using System.Net.Http.Headers;
using ECommerceBackend.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ECommerceBackend.Tests;

public class UsersControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public UsersControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private WebApplicationFactory<Program> CreateAuthenticatedApplication()
    {
        return _factory.WithWebHostBuilder(builder =>
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
        });
    }

    private static HttpClient CreateAdminClient(WebApplicationFactory<Program> application)
    {
        var client = application.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestScheme");
        client.DefaultRequestHeaders.Add("X-Test-Role", "Admin");
        client.DefaultRequestHeaders.Add("X-Test-UserId", "1");
        return client;
    }

    private static async Task ResetDatabaseAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
        await db.Database.EnsureDeletedAsync();
        await db.Database.EnsureCreatedAsync();

        db.Roles.AddRange(
            new Role { Roleid = 1, Rolename = "Admin" },
            new Role { Roleid = 3, Rolename = "Customer" });

        db.Users.AddRange(
            new User
            {
                Userid = 1,
                Roleid = 1,
                Username = "admin",
                Passwordhash = "hash",
                Fullname = "Admin",
                Email = "admin@test.local",
                Isactive = true,
                Createdat = DateTime.Now
            },
            new User
            {
                Userid = 2,
                Roleid = 3,
                Username = "customer",
                Passwordhash = "hash",
                Fullname = "Customer",
                Email = "customer@test.local",
                Isactive = true,
                Createdat = DateTime.Now
            });

        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task DeleteUser_CustomerAccount_ReturnsConflictAndKeepsUser()
    {
        using var application = CreateAuthenticatedApplication();
        await ResetDatabaseAsync(application.Services);
        using var client = CreateAdminClient(application);

        var response = await client.DeleteAsync("/api/Users/2");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);

        using var scope = application.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
        Assert.True(await db.Users.AnyAsync(user => user.Userid == 2));
    }
}
