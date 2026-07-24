using System.Net;
using System.Net.Http.Json;
using ECommerceBackend.DTOs.Orders;
using ECommerceBackend.DTOs.Shipping;
using ECommerceBackend.IntegrationTests.Infrastructure;
using ECommerceBackend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ECommerceBackend.IntegrationTests;

public sealed class OperationalEmailNotificationTests : IClassFixture<IntegrationTestFactory>
{
    private readonly IntegrationTestFactory _factory;

    public OperationalEmailNotificationTests(IntegrationTestFactory factory) => _factory = factory;

    [Fact]
    public async Task Sales_Warehouse_And_Delivery_Milestones_Send_Customer_Emails()
    {
        var (orderId, imei) = await SeedPendingOrderAsync();
        using var admin = await _factory.CreateAuthenticatedClientAsync("it_admin");

        var handoff = await admin.PostAsJsonAsync(
            $"/api/OrderAssignments/{orderId}/handoff-to-warehouse",
            new HandoffOrderRequestDto("Sales confirmed"));
        Assert.Equal(HttpStatusCode.OK, handoff.StatusCode);

        var shipped = await admin.PostAsJsonAsync(
            $"/api/OrderAssignments/{orderId}/mark-shipped",
            new MarkOrderShippedRequestDto(
                [imei],
                "Packed and handed over",
                "GHN",
                30_000m,
                DateTime.UtcNow.AddDays(2)));
        Assert.Equal(HttpStatusCode.OK, shipped.StatusCode);

        int shipmentId;
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
            shipmentId = await db.Shipments
                .Where(item => item.Orderid == orderId)
                .Select(item => item.Shipmentid)
                .SingleAsync();
        }

        foreach (var status in new[] { "PickedUp", "InTransit", "OutForDelivery", "Delivered" })
        {
            var response = await admin.PatchAsJsonAsync(
                $"/api/Shipments/{shipmentId}/status",
                new UpdateShipmentStatusDto(status));
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        var emailService = _factory.Services.GetRequiredService<TestEmailService>();
        Assert.Contains(emailService.Events, item =>
            item.Type == "OrderStatusUpdated" &&
            item.OrderId == orderId &&
            item.Status == "Processing");
        Assert.Contains(emailService.Events, item =>
            item.Type == "OrderStatusUpdated" &&
            item.OrderId == orderId &&
            item.Status == "Shipped");
        Assert.Contains(emailService.Events, item =>
            item.Type == "ShipmentStatusUpdated" &&
            item.OrderId == orderId &&
            item.Status == "OutForDelivery");
        Assert.Contains(emailService.Events, item =>
            item.Type == "ShipmentStatusUpdated" &&
            item.OrderId == orderId &&
            item.Status == "Delivered");
    }

    private async Task<(int OrderId, string Imei)> SeedPendingOrderAsync()
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
        var user = await db.Users.FirstAsync(item => item.Userid == _factory.Seed.CustomerAUserId);
        var customer = await db.Customers.FirstAsync(item => item.Email == "it.a@example.test");
        var variant = await db.Productvariants.FirstAsync(item => item.Variantid == _factory.Seed.CheckoutVariantId);
        var imei = $"IT-EMAIL-{Guid.NewGuid():N}";
        var inventory = new Inventoryitem
        {
            Imei = imei,
            Variant = variant,
            Status = "Reserved",
            Importedat = DateTime.UtcNow
        };
        var order = new Order
        {
            User = user,
            Customer = customer,
            Orderdate = DateTime.UtcNow,
            Totalamount = 900_000m,
            Finalamount = 900_000m,
            Paymentmethod = "COD",
            Paymentstatus = "CODPending",
            Paidamount = 0,
            Requiredpayment = 900_000m,
            Checkouttype = "Registered",
            Orderstatus = "Pending",
            Shippingname = customer.Fullname,
            Shippingphone = "0900000001",
            Shippingemail = customer.Email,
            Shippingaddress = customer.Address
        };
        order.Orderitems.Add(new Orderitem
        {
            ImeiNavigation = inventory,
            Sellingprice = 900_000m
        });
        db.Orders.Add(order);
        await db.SaveChangesAsync();
        return (order.Orderid, imei);
    }
}
