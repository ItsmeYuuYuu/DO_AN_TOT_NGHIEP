using ECommerceBackend.DTOs.Warranties;
using ECommerceBackend.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace ECommerceBackend.Tests;

public class WarrantyClaimsControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public WarrantyClaimsControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.WithWebHostBuilder(builder =>
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
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestScheme");
    }

    private async Task SeedDataAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
        await db.Database.EnsureDeletedAsync();
        await db.Database.EnsureCreatedAsync();

        var warrantyRole = new Role { Roleid = 7, Rolename = "Warranty" };
        var adminRole = new Role { Roleid = 1, Rolename = "Admin" };
        db.Roles.AddRange(warrantyRole, adminRole);
        db.Users.AddRange(
            new User
            {
                Userid = 1,
                Roleid = 7,
                Username = "warranty-one",
                Fullname = "Warranty One",
                Passwordhash = "hash",
                Isactive = true
            },
            new User
            {
                Userid = 2,
                Roleid = 7,
                Username = "warranty-two",
                Fullname = "Warranty Two",
                Passwordhash = "hash",
                Isactive = true
            },
            new User
            {
                Userid = 3,
                Roleid = 1,
                Username = "admin",
                Fullname = "Admin",
                Passwordhash = "hash",
                Isactive = true
            });

        db.Customers.Add(new Customer
        {
            Customerid = 1,
            Fullname = "Customer One",
            Phone = "0900000001"
        });
        db.Inventoryitems.Add(new Inventoryitem
        {
            Imei = "WARRANTY-IMEI-1",
            Status = "Sold",
            Warrantystartdate = DateTime.UtcNow.AddMonths(-1),
            Warrantyenddate = DateTime.UtcNow.AddMonths(11),
            Warrantystatus = "Active"
        });
        db.Orders.Add(new Order
        {
            Orderid = 1,
            Customerid = 1,
            Orderstatus = "Completed",
            Orderdate = DateTime.UtcNow.AddMonths(-1),
            Orderitems = new List<Orderitem>
            {
                new() { Imei = "WARRANTY-IMEI-1", Sellingprice = 10_000_000 }
            }
        });
        await db.SaveChangesAsync();
    }

    private void SetIdentity(string role, int userId)
    {
        _client.DefaultRequestHeaders.Remove("X-Test-Role");
        _client.DefaultRequestHeaders.Add("X-Test-Role", role);
        _client.DefaultRequestHeaders.Remove("X-Test-UserId");
        _client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());
    }

    private async Task<WarrantyClaimDto> CreateClaimAsync(string role = "Warranty", int userId = 1)
    {
        SetIdentity(role, userId);
        var response = await _client.PostAsJsonAsync(
            "/api/WarrantyClaims",
            new CreateWarrantyClaimRequestDto(
                "WARRANTY-IMEI-1",
                "Thiết bị không lên nguồn.",
                ["/uploads/warranties/test-device.png"]));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<WarrantyClaimDto>())!;
    }

    [Fact]
    public async Task CreateClaim_AssignsWarrantyEmployeeAndMarksDeviceInService()
    {
        await SeedDataAsync();

        var claim = await CreateClaimAsync();

        Assert.Equal("Received", claim.Status);
        Assert.Equal("InWarranty", claim.Coverage);
        Assert.Equal(1, claim.Assigneduserid);
        Assert.Single(claim.Histories);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
        Assert.Equal(
            "InService",
            db.Inventoryitems.Single(item => item.Imei == "WARRANTY-IMEI-1").Warrantystatus);
    }

    [Fact]
    public async Task UpdateStatus_FullWorkflow_RecordsHistoryAndRestoresWarranty()
    {
        await SeedDataAsync();
        var claim = await CreateClaimAsync();

        foreach (var status in new[] { "Inspecting", "Repairing" })
        {
            var response = await _client.PatchAsJsonAsync(
                $"/api/WarrantyClaims/{claim.Claimid}/status",
                new UpdateWarrantyClaimStatusRequestDto(status, 200_000, null, null, status));
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        var missingConclusion = await _client.PatchAsJsonAsync(
            $"/api/WarrantyClaims/{claim.Claimid}/status",
            new UpdateWarrantyClaimStatusRequestDto("Completed", null, 150_000, null, null));
        Assert.Equal(HttpStatusCode.BadRequest, missingConclusion.StatusCode);

        var completed = await _client.PatchAsJsonAsync(
            $"/api/WarrantyClaims/{claim.Claimid}/status",
            new UpdateWarrantyClaimStatusRequestDto(
                "Completed",
                200_000,
                150_000,
                "Đã thay cáp nguồn và kiểm tra ổn định.",
                "Hoàn tất sửa chữa."));
        Assert.Equal(HttpStatusCode.OK, completed.StatusCode);

        var returned = await _client.PatchAsJsonAsync(
            $"/api/WarrantyClaims/{claim.Claimid}/status",
            new UpdateWarrantyClaimStatusRequestDto(
                "Returned",
                null,
                null,
                null,
                "Đã bàn giao thiết bị cho khách."));
        Assert.Equal(HttpStatusCode.OK, returned.StatusCode);
        var result = await returned.Content.ReadFromJsonAsync<WarrantyClaimDto>();

        Assert.NotNull(result);
        Assert.Equal("Returned", result.Status);
        Assert.Equal(5, result.Histories.Count);
        Assert.Equal(150_000, result.Finalcost);
        Assert.NotNull(result.Completedat);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
        Assert.Equal(
            "Active",
            db.Inventoryitems.Single(item => item.Imei == "WARRANTY-IMEI-1").Warrantystatus);
    }

    [Fact]
    public async Task Claim_SecondWarrantyEmployeeCannotTakeAssignedTicket()
    {
        await SeedDataAsync();
        var claim = await CreateClaimAsync("Admin", 3);

        SetIdentity("Warranty", 1);
        var firstClaim = await _client.PostAsync(
            $"/api/WarrantyClaims/{claim.Claimid}/claim",
            null);
        Assert.Equal(HttpStatusCode.OK, firstClaim.StatusCode);

        SetIdentity("Warranty", 2);
        var secondClaim = await _client.PostAsync(
            $"/api/WarrantyClaims/{claim.Claimid}/claim",
            null);

        Assert.Equal(HttpStatusCode.Conflict, secondClaim.StatusCode);
    }
}
