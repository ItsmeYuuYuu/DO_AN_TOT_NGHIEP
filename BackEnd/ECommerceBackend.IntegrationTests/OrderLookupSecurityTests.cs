using System.Net;
using System.Net.Http.Json;
using ECommerceBackend.DTOs.Orders;
using ECommerceBackend.IntegrationTests.Infrastructure;
using ECommerceBackend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ECommerceBackend.IntegrationTests;

public sealed class OrderLookupSecurityTests : IClassFixture<IntegrationTestFactory>
{
    private readonly IntegrationTestFactory _factory;

    public OrderLookupSecurityTests(IntegrationTestFactory factory) => _factory = factory;

    [Fact]
    public async Task Guest_Lookup_Requires_Order_Id_Phone_And_Original_Guest_Token()
    {
        var guestToken = Guid.NewGuid().ToString();
        var orderId = await SeedGuestOrderAsync(guestToken, "0900888777");

        using var validClient = _factory.CreateClient();
        validClient.DefaultRequestHeaders.Add("x-guest-session-token", guestToken);
        var valid = await validClient.GetAsync($"/api/Orders/lookup?phone=0900888777&orderid={orderId}");
        var orders = await valid.Content.ReadFromJsonAsync<List<OrderLookupDto>>();

        Assert.Equal(HttpStatusCode.OK, valid.StatusCode);
        Assert.Single(orders!);
        Assert.Equal(orderId, orders![0].Orderid);

        using var wrongClient = _factory.CreateClient();
        wrongClient.DefaultRequestHeaders.Add("x-guest-session-token", Guid.NewGuid().ToString());
        var wrongToken = await wrongClient.GetFromJsonAsync<List<OrderLookupDto>>(
            $"/api/Orders/lookup?phone=0900888777&orderid={orderId}");
        Assert.Empty(wrongToken!);

        var missingOrderId = await validClient.GetAsync("/api/Orders/lookup?phone=0900888777");
        Assert.Equal(HttpStatusCode.BadRequest, missingOrderId.StatusCode);
    }

    [Fact]
    public async Task Logged_In_Customer_Can_Only_Lookup_Own_Order()
    {
        using var owner = await _factory.CreateAuthenticatedClientAsync("it_customer_a");
        var own = await owner.GetFromJsonAsync<List<OrderLookupDto>>(
            $"/api/Orders/lookup?phone=0900000001&orderid={_factory.Seed.CustomerAOrderId}");
        Assert.Single(own!);

        using var anotherCustomer = await _factory.CreateAuthenticatedClientAsync("it_customer_b");
        var foreign = await anotherCustomer.GetFromJsonAsync<List<OrderLookupDto>>(
            $"/api/Orders/lookup?phone=0900000001&orderid={_factory.Seed.CustomerAOrderId}");
        Assert.Empty(foreign!);
    }

    private async Task<int> SeedGuestOrderAsync(string guestToken, string shippingPhone)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
        var customer = new Customer
        {
            Fullname = "Guest Lookup",
            Phone = "0900111222",
            Email = "guest.lookup@example.test",
            Address = "Customer profile address",
            Createdat = DateTime.UtcNow
        };
        var order = new Order
        {
            Customer = customer,
            Orderdate = DateTime.UtcNow,
            Totalamount = 500_000m,
            Finalamount = 500_000m,
            Paymentmethod = "COD",
            Paymentstatus = "Unpaid",
            Checkouttype = "Guest",
            Orderstatus = "Pending",
            Shippingname = "Guest Recipient",
            Shippingphone = shippingPhone,
            Shippingemail = "guest.lookup@example.test",
            Shippingaddress = "Shipping address",
            Guesttoken = guestToken
        };
        db.Orders.Add(order);
        await db.SaveChangesAsync();
        return order.Orderid;
    }
}
