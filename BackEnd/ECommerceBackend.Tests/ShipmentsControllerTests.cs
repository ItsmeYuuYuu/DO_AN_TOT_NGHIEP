using System.Net;
using System.Net.Http.Json;
using ECommerceBackend.DTOs.Shipping;
using ECommerceBackend.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using System.Net.Http.Headers;

namespace ECommerceBackend.Tests;

public class ShipmentsControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public ShipmentsControllerTests(CustomWebApplicationFactory factory)
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

    private void Authenticate(string role, string userId = "1")
    {
        _client.DefaultRequestHeaders.Remove("X-Test-Role");
        _client.DefaultRequestHeaders.Remove("X-Test-UserId");
        _client.DefaultRequestHeaders.Add("X-Test-Role", role);
        _client.DefaultRequestHeaders.Add("X-Test-UserId", userId);
    }

    private async Task SeedShipmentAsync(
        int orderId,
        string status = "AwaitingPickup",
        decimal paidAmount = 0,
        string paymentStatus = "CODPending")
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
        db.Shipmenthistories.RemoveRange(db.Shipmenthistories);
        db.Shipments.RemoveRange(db.Shipments);
        db.Orderpayments.RemoveRange(db.Orderpayments);
        db.Orderitems.RemoveRange(db.Orderitems);
        db.Orders.RemoveRange(db.Orders);
        db.Inventorytransactions.RemoveRange(db.Inventorytransactions);
        db.Inventoryitems.RemoveRange(db.Inventoryitems);
        await db.SaveChangesAsync();

        if (!db.Users.Any(item => item.Userid == 1))
        {
            db.Users.Add(new User
            {
                Userid = 1,
                Username = "sales-test",
                Passwordhash = "hash",
                Fullname = "Sales Test",
                Isactive = true
            });
        }
        if (!db.Users.Any(item => item.Userid == 2))
        {
            db.Users.Add(new User
            {
                Userid = 2,
                Username = "warehouse-test",
                Passwordhash = "hash",
                Fullname = "Warehouse Test",
                Isactive = true
            });
        }

        var inventory = new Inventoryitem
        {
            Imei = $"SHIP-{orderId}",
            Status = "Shipping"
        };
        var customer = new Customer
        {
            Fullname = "Khách Demo",
            Phone = $"0900{orderId:D6}",
            Email = $"shipment{orderId}@test.local"
        };
        var order = new Order
        {
            Orderid = orderId,
            Customer = customer,
            Orderstatus = "Shipped",
            Paymentmethod = paidAmount > 0 ? "VNPAY" : "COD",
            Paymentstatus = paymentStatus,
            Paidamount = paidAmount,
            Finalamount = 1000000,
            Shippingname = "Khách Demo",
            Shippingphone = "0900000000",
            Shippingaddress = "Đà Nẵng",
            Orderitems =
            [
                new Orderitem
                {
                    Imei = inventory.Imei,
                    Sellingprice = 1000000
                }
            ]
        };
        var shipment = new Shipment
        {
            Orderid = orderId,
            Carrier = "GHN",
            Trackingcode = $"GHN-DEMO-{orderId}",
            Shippingfee = 30000,
            Status = status,
            Deliveryattempts = 0,
            Createdat = DateTime.UtcNow,
            Updatedat = DateTime.UtcNow,
            Order = order
        };
        shipment.Histories.Add(new Shipmenthistory
        {
            Tostatus = status,
            Createdat = DateTime.UtcNow
        });

        db.Inventoryitems.Add(inventory);
        db.Shipments.Add(shipment);
        await db.SaveChangesAsync();
    }

    private async Task<HttpResponseMessage> ChangeStatusAsync(int shipmentId, string status)
    {
        return await _client.PatchAsJsonAsync(
            $"/api/Shipments/{shipmentId}/status",
            new UpdateShipmentStatusDto(status, $"Move to {status}"));
    }

    [Fact]
    public async Task Delivered_CompletesOrderCollectsPaymentAndActivatesWarranty()
    {
        await SeedShipmentAsync(501);
        Authenticate("Sales");

        int shipmentId;
        using (var scope = _factory.Services.CreateScope())
        {
            shipmentId = scope.ServiceProvider.GetRequiredService<ECommerceContext>()
                .Shipments.Single(item => item.Orderid == 501).Shipmentid;
        }

        foreach (var status in new[] { "PickedUp", "InTransit", "OutForDelivery", "Delivered" })
        {
            var response = await ChangeStatusAsync(shipmentId, status);
            Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        }

        using var verifyScope = _factory.Services.CreateScope();
        var db = verifyScope.ServiceProvider.GetRequiredService<ECommerceContext>();
        var order = db.Orders.Single(item => item.Orderid == 501);
        var inventory = db.Inventoryitems.Single(item => item.Imei == "SHIP-501");
        var shipment = db.Shipments.Single(item => item.Shipmentid == shipmentId);

        Assert.Equal("Completed", order.Orderstatus);
        Assert.Equal("Paid", order.Paymentstatus);
        Assert.Equal(order.Finalamount, order.Paidamount);
        Assert.Equal("Sold", inventory.Status);
        Assert.Equal("Active", inventory.Warrantystatus);
        Assert.NotNull(inventory.Warrantystartdate);
        Assert.NotNull(inventory.Warrantyenddate);
        Assert.Equal(1, shipment.Deliveryattempts);
        Assert.Equal("Delivered", shipment.Status);
        Assert.Contains(db.Inventorytransactions, item =>
            item.Orderid == 501 &&
            item.Transactiontype == "CompleteSale" &&
            item.Tostatus == "Sold");
    }

    [Fact]
    public async Task ReturnedToWarehouse_RestocksImeiAndRefundsPaidAmount()
    {
        await SeedShipmentAsync(502, "InTransit", 300000, "DepositPaid");
        Authenticate("Sales");

        int shipmentId;
        using (var scope = _factory.Services.CreateScope())
        {
            shipmentId = scope.ServiceProvider.GetRequiredService<ECommerceContext>()
                .Shipments.Single(item => item.Orderid == 502).Shipmentid;
        }

        var failed = await ChangeStatusAsync(shipmentId, "DeliveryFailed");
        Assert.True(failed.IsSuccessStatusCode, await failed.Content.ReadAsStringAsync());
        var returning = await ChangeStatusAsync(shipmentId, "Returning");
        Assert.True(returning.IsSuccessStatusCode, await returning.Content.ReadAsStringAsync());

        Authenticate("Warehouse", "2");
        var returned = await ChangeStatusAsync(shipmentId, "ReturnedToWarehouse");
        Assert.True(returned.IsSuccessStatusCode, await returned.Content.ReadAsStringAsync());

        using var verifyScope = _factory.Services.CreateScope();
        var db = verifyScope.ServiceProvider.GetRequiredService<ECommerceContext>();
        var order = db.Orders.Single(item => item.Orderid == 502);
        var inventory = db.Inventoryitems.Single(item => item.Imei == "SHIP-502");

        Assert.Equal("Returned", order.Orderstatus);
        Assert.Equal("Refunded", order.Paymentstatus);
        Assert.Equal(0, order.Paidamount);
        Assert.Equal("InStock", inventory.Status);
        Assert.Contains(db.Orderpayments, item =>
            item.Orderid == 502 &&
            item.Paymenttype == "DeliveryReturnRefund" &&
            item.Amount == 300000);
        Assert.Contains(db.Inventorytransactions, item =>
            item.Orderid == 502 &&
            item.Transactiontype == "DeliveryReturn" &&
            item.Tostatus == "InStock");
    }

    [Fact]
    public async Task InvalidTransition_ReturnsConflict()
    {
        await SeedShipmentAsync(503);
        Authenticate("Sales");

        int shipmentId;
        using (var scope = _factory.Services.CreateScope())
        {
            shipmentId = scope.ServiceProvider.GetRequiredService<ECommerceContext>()
                .Shipments.Single(item => item.Orderid == 503).Shipmentid;
        }

        var response = await ChangeStatusAsync(shipmentId, "Delivered");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task PublicLookup_ReturnsSafeShipmentTimeline()
    {
        await SeedShipmentAsync(504, "InTransit");

        var response = await _client.GetAsync("/api/Orders/lookup?phone=0900000504&orderid=504");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var orders = await response.Content.ReadFromJsonAsync<List<ECommerceBackend.DTOs.Orders.OrderLookupDto>>();
        var order = Assert.Single(orders!);
        Assert.NotNull(order.Shipment);
        Assert.Equal("GHN-DEMO-504", order.Shipment.Trackingcode);
        Assert.Equal("InTransit", order.Shipment.Status);
        Assert.Single(order.Shipment.Histories);
    }
}
