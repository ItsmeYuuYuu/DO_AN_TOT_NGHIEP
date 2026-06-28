using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using ECommerceBackend.DTOs.Customers;
using ECommerceBackend.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ECommerceBackend.Tests;

public class CustomersControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public CustomersControllerTests(CustomWebApplicationFactory factory)
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
            new Role { Roleid = 3, Rolename = "Customer" },
            new Role { Roleid = 8, Rolename = "Content" });

        db.Users.AddRange(
            new User
            {
                Userid = 1,
                Roleid = 1,
                Username = "admin",
                Passwordhash = "hash",
                Fullname = "Quản trị viên",
                Email = "admin@test.local",
                Phone = "0900000001",
                Isactive = true,
                Createdat = DateTime.Now.AddDays(-1)
            },
            new User
            {
                Userid = 2,
                Roleid = 3,
                Username = "fresh_customer",
                Passwordhash = "hash",
                Fullname = "Fresh Customer",
                Email = "fresh.customer@test.local",
                Phone = "0900000002",
                Isactive = true,
                Createdat = DateTime.Now
            });

        db.Customers.AddRange(
            new Customer
            {
                Customerid = 1,
                Fullname = "Old Customer",
                Email = "old.customer@test.local",
                Phone = "0900000003",
                Createdat = DateTime.Now.AddDays(-7)
            },
            new Customer
            {
                Customerid = 2,
                Fullname = "Quản trị viên",
                Email = "admin@test.local",
                Phone = "0900000001",
                Createdat = DateTime.Now
            },
            new Customer
            {
                Customerid = 3,
                Fullname = "Fresh Customer",
                Email = "fresh.customer@test.local",
                Phone = "0900000002",
                Createdat = DateTime.Now
            });

        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task GetCustomers_ReturnsNewestCustomerFirst_AndHidesInternalUsers()
    {
        using var application = CreateAuthenticatedApplication();
        await ResetDatabaseAsync(application.Services);
        using var client = CreateAdminClient(application);

        var response = await client.GetAsync("/api/Customers");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var customers = await response.Content.ReadFromJsonAsync<List<CustomerDto>>();
        Assert.NotNull(customers);
        Assert.NotEmpty(customers!);
        Assert.Equal("fresh.customer@test.local", customers![0].Email);
        Assert.DoesNotContain(customers, customer => customer.Email == "admin@test.local");
    }

    [Fact]
    public async Task UpdateCustomerAccountStatus_DisablesLinkedCustomerAccount()
    {
        using var application = CreateAuthenticatedApplication();
        await ResetDatabaseAsync(application.Services);
        using var client = CreateAdminClient(application);

        var response = await client.PatchAsJsonAsync("/api/Customers/3/account-status", new { isactive = false });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var customer = await response.Content.ReadFromJsonAsync<CustomerDto>();
        Assert.NotNull(customer);
        Assert.Equal(2, customer!.Userid);
        Assert.False(customer.Accountisactive);

        using var scope = application.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
        var user = await db.Users.FindAsync(2);
        Assert.NotNull(user);
        Assert.False(user!.Isactive);
    }

    [Fact]
    public async Task UpdateCustomerAccountStatus_DoesNotToggleInternalAccountMatchedToCustomerRow()
    {
        using var application = CreateAuthenticatedApplication();
        await ResetDatabaseAsync(application.Services);
        using var client = CreateAdminClient(application);

        var response = await client.PatchAsJsonAsync("/api/Customers/2/account-status", new { isactive = false });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        using var scope = application.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
        var admin = await db.Users.FindAsync(1);
        Assert.NotNull(admin);
        Assert.True(admin!.Isactive);
    }
}
