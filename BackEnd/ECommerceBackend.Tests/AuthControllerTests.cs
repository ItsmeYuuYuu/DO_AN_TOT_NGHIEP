using System.Net;
using System.Net.Http.Json;
using ECommerceBackend.DTOs.Auth;
using ECommerceBackend.DTOs.Common;
using ECommerceBackend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ECommerceBackend.Tests;

public class AuthControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public AuthControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task ResetDatabaseAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
        await db.Database.EnsureDeletedAsync();
        await db.Database.EnsureCreatedAsync();
        db.Roles.Add(new Role { Roleid = 3, Rolename = "Customer" });
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task Register_Success_CreatesUserAndCustomerProfile()
    {
        await ResetDatabaseAsync();
        var request = new RegisterRequestDto(
            "new_customer",
            "Password@123",
            "Nguyen Van Moi",
            "new.customer@gmail.com",
            "0912345678");

        var response = await _client.PostAsJsonAsync("/api/auth/register", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var message = await response.Content.ReadFromJsonAsync<ApiMessageDto>();
        Assert.Contains("Đăng ký thành công", message?.Message);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
        var user = await db.Users.SingleAsync(item => item.Username == "new_customer");
        var customer = await db.Customers.SingleAsync(item => item.Email == "new.customer@gmail.com");
        Assert.Equal(3, user.Roleid);
        Assert.True(user.Isactive);
        Assert.Equal(user.Fullname, customer.Fullname);
        Assert.Equal(user.Phone, customer.Phone);
    }

    [Fact]
    public async Task Register_DuplicateEmail_ReturnsConflict()
    {
        await ResetDatabaseAsync();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
            db.Users.Add(new User
            {
                Userid = 20,
                Roleid = 3,
                Username = "existing_customer",
                Passwordhash = "hash",
                Fullname = "Existing Customer",
                Email = "used@gmail.com",
                Phone = "0900000020",
                Isactive = true,
                Createdat = DateTime.Now
            });
            await db.SaveChangesAsync();
        }

        var request = new RegisterRequestDto(
            "another_customer",
            "Password@123",
            "Another Customer",
            "USED@gmail.com",
            "0912345679");

        var response = await _client.PostAsJsonAsync("/api/auth/register", request);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<ApiErrorDto>();
        Assert.Equal("Email đã được sử dụng cho tài khoản khác.", error?.Message);
    }

    [Fact]
    public async Task Register_WeakPassword_ReturnsBadRequest()
    {
        await ResetDatabaseAsync();
        var request = new RegisterRequestDto(
            "weak_password",
            "Yuuyuu1608",
            "Weak Password",
            "weak.password@gmail.com",
            "0912345680");

        var response = await _client.PostAsJsonAsync("/api/auth/register", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Login_WithEmail_AllowsExistingPasswordWithoutSpecialCharacter()
    {
        await ResetDatabaseAsync();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
            db.Users.Add(new User
            {
                Userid = 21,
                Roleid = 3,
                Username = "yuuyuu",
                Passwordhash = BCrypt.Net.BCrypt.HashPassword("Yuuyuu1608"),
                Fullname = "Yuu Yuu",
                Email = "yuuyuu@gmail.com",
                Phone = "0912345681",
                Isactive = true,
                Createdat = DateTime.Now
            });
            await db.SaveChangesAsync();
        }

        var response = await _client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequestDto("YUUYUU@GMAIL.COM", "Yuuyuu1608"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var login = await response.Content.ReadFromJsonAsync<LoginResponseDto>();
        Assert.Equal("yuuyuu", login?.Username);
        Assert.Equal("Customer", login?.Rolename);
    }
}
