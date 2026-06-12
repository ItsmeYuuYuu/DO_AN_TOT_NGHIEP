using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using ECommerceBackend.DTOs.Returns;
using ECommerceBackend.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ECommerceBackend.Tests;

public class ReturnRequestsControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public ReturnRequestsControllerTests(CustomWebApplicationFactory factory)
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

    private void SetIdentity(string role, int userId)
    {
        _client.DefaultRequestHeaders.Remove("X-Test-Role");
        _client.DefaultRequestHeaders.Add("X-Test-Role", role);
        _client.DefaultRequestHeaders.Remove("X-Test-UserId");
        _client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());
    }

    private async Task SeedDataAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
        await db.Database.EnsureDeletedAsync();
        await db.Database.EnsureCreatedAsync();

        db.Roles.AddRange(
            new Role { Roleid = 1, Rolename = "Admin" },
            new Role { Roleid = 3, Rolename = "Customer" },
            new Role { Roleid = 5, Rolename = "Sales" },
            new Role { Roleid = 6, Rolename = "Warehouse" });
        db.Users.AddRange(
            new User
            {
                Userid = 1,
                Roleid = 3,
                Username = "customer",
                Fullname = "Customer",
                Email = "customer@test.com",
                Passwordhash = "hash",
                Isactive = true
            },
            new User
            {
                Userid = 2,
                Roleid = 5,
                Username = "sales",
                Fullname = "Sales",
                Passwordhash = "hash",
                Isactive = true
            },
            new User
            {
                Userid = 3,
                Roleid = 6,
                Username = "warehouse",
                Fullname = "Warehouse",
                Passwordhash = "hash",
                Isactive = true
            });

        db.Customers.Add(new Customer
        {
            Customerid = 1,
            Fullname = "Customer",
            Phone = "0900000001",
            Email = "customer@test.com"
        });
        var product = new Product
        {
            Productid = 1,
            Productname = "Demo Phone"
        };
        var variant = new Productvariant
        {
            Variantid = 1,
            Productid = 1,
            Sku = "DEMO-128GB",
            Baseprice = 10_000_000,
            Condition = "New Seal"
        };
        db.Products.Add(product);
        db.Productvariants.Add(variant);
        db.Inventoryitems.AddRange(
            new Inventoryitem
            {
                Imei = "SOLD-IMEI-1",
                Variantid = 1,
                Status = "Sold",
                Warrantystatus = "Active",
                Warrantyenddate = DateTime.UtcNow.AddMonths(11)
            },
            new Inventoryitem
            {
                Imei = "REPLACEMENT-IMEI-1",
                Variantid = 1,
                Status = "InStock"
            });
        db.Orders.Add(new Order
        {
            Orderid = 1,
            Userid = 1,
            Customerid = 1,
            Orderstatus = "Completed",
            Paymentstatus = "Paid",
            Paidamount = 10_000_000,
            Finalamount = 10_000_000,
            Totalamount = 10_000_000,
            Paymentmethod = "VNPay",
            Orderdate = DateTime.UtcNow.AddDays(-2),
            Orderitems =
            [
                new Orderitem
                {
                    Orderitemid = 1,
                    Imei = "SOLD-IMEI-1",
                    Sellingprice = 10_000_000
                }
            ]
        });
        await db.SaveChangesAsync();
    }

    private async Task<ReturnRequestDto> CreateAndApproveAsync(string type)
    {
        SetIdentity("Customer", 1);
        var createResponse = await _client.PostAsJsonAsync(
            "/api/ReturnRequests",
            new CreateReturnRequestDto(
                1,
                type,
                "Thiết bị không phù hợp nhu cầu.",
                "Máy còn đầy đủ phụ kiện.",
                [1],
                ["/uploads/returns/demo.png"]));
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var request = (await createResponse.Content.ReadFromJsonAsync<ReturnRequestDto>())!;

        SetIdentity("Sales", 2);
        var claimResponse = await _client.PostAsync(
            $"/api/ReturnRequests/{request.Returnrequestid}/claim",
            null);
        Assert.Equal(HttpStatusCode.OK, claimResponse.StatusCode);

        var reviewResponse = await _client.PatchAsJsonAsync(
            $"/api/ReturnRequests/{request.Returnrequestid}/review",
            new ReviewReturnRequestDto(true, "Đủ điều kiện tiếp nhận."));
        Assert.Equal(HttpStatusCode.OK, reviewResponse.StatusCode);
        return (await reviewResponse.Content.ReadFromJsonAsync<ReturnRequestDto>())!;
    }

    [Fact]
    public async Task FullReturnFlow_RestocksImeiAndRefundsOrder()
    {
        await SeedDataAsync();
        var request = await CreateAndApproveAsync("Return");

        SetIdentity("Warehouse", 3);
        var receiveResponse = await _client.PatchAsJsonAsync(
            $"/api/ReturnRequests/{request.Returnrequestid}/receive",
            new ReceiveReturnRequestDto(
                [new ReceiveReturnItemDto(
                    request.Items.Single().Returnitemid,
                    "Máy nguyên vẹn, đủ hộp.",
                    "Restock",
                    null,
                    10_000_000)],
                "Nhập lại kho.",
                "Kho đã kiểm tra."));
        Assert.Equal(HttpStatusCode.OK, receiveResponse.StatusCode);
        var received = (await receiveResponse.Content.ReadFromJsonAsync<ReturnRequestDto>())!;
        Assert.Equal("RefundPending", received.Status);

        SetIdentity("Sales", 2);
        var refundResponse = await _client.PostAsJsonAsync(
            $"/api/ReturnRequests/{request.Returnrequestid}/refund",
            new ProcessRefundDto(10_000_000, "VNPay", "REF-TEST-1", "Hoàn đủ tiền."));
        Assert.True(
            refundResponse.StatusCode == HttpStatusCode.OK,
            await refundResponse.Content.ReadAsStringAsync());
        var completed = (await refundResponse.Content.ReadFromJsonAsync<ReturnRequestDto>())!;
        Assert.Equal("Completed", completed.Status);
        Assert.Equal("Refunded", completed.Refundstatus);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
        Assert.Equal("InStock", (await db.Inventoryitems.FindAsync("SOLD-IMEI-1"))!.Status);
        Assert.Equal("Returned", (await db.Orders.FindAsync(1))!.Orderstatus);
        Assert.Equal("Refunded", (await db.Orders.FindAsync(1))!.Paymentstatus);
        Assert.Contains(await db.Inventorytransactions.ToListAsync(), item =>
            item.Imei == "SOLD-IMEI-1" && item.Transactiontype == "CustomerReturn");
    }

    [Fact]
    public async Task ExchangeFlow_RequiresAndShipsReplacementFromSameVariant()
    {
        await SeedDataAsync();
        var request = await CreateAndApproveAsync("Exchange");

        SetIdentity("Warehouse", 3);
        var receiveResponse = await _client.PatchAsJsonAsync(
            $"/api/ReturnRequests/{request.Returnrequestid}/receive",
            new ReceiveReturnRequestDto(
                [new ReceiveReturnItemDto(
                    request.Items.Single().Returnitemid,
                    "Máy lỗi phần cứng.",
                    "Warranty",
                    "REPLACEMENT-IMEI-1",
                    null)],
                "Đổi máy cùng cấu hình.",
                null));
        Assert.Equal(HttpStatusCode.OK, receiveResponse.StatusCode);
        var completed = (await receiveResponse.Content.ReadFromJsonAsync<ReturnRequestDto>())!;
        Assert.Equal("Completed", completed.Status);
        Assert.Equal("REPLACEMENT-IMEI-1", completed.Items.Single().Replacementimei);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
        Assert.Equal("Warranty", (await db.Inventoryitems.FindAsync("SOLD-IMEI-1"))!.Status);
        Assert.Equal("Sold", (await db.Inventoryitems.FindAsync("REPLACEMENT-IMEI-1"))!.Status);
        Assert.Equal("REPLACEMENT-IMEI-1", (await db.Orderitems.FindAsync(1))!.Imei);
    }

    [Fact]
    public async Task Customer_CannotCreateReturnForAnotherUsersOrder()
    {
        await SeedDataAsync();
        SetIdentity("Customer", 99);

        var response = await _client.PostAsJsonAsync(
            "/api/ReturnRequests",
            new CreateReturnRequestDto(
                1,
                "Return",
                "Không thuộc đơn của tôi.",
                null,
                [1],
                []));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
