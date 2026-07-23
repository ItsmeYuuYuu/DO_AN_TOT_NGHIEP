using System.Net;
using System.Net.Http.Json;
using ECommerceBackend.DTOs.Orders;
using ECommerceBackend.IntegrationTests.Infrastructure;
using ECommerceBackend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ECommerceBackend.IntegrationTests;

public sealed class PaymentCancellationTests : IClassFixture<IntegrationTestFactory>
{
    private readonly IntegrationTestFactory _factory;

    public PaymentCancellationTests(IntegrationTestFactory factory) => _factory = factory;

    [Fact]
    public async Task Customer_Can_Stop_Bank_Payment_And_Release_Reserved_Device()
    {
        using var customer = await _factory.CreateAuthenticatedClientAsync("it_customer_a");
        var create = await customer.PostAsJsonAsync("/api/Orders", new CreateOrderRequestDto(
            _factory.Seed.CustomerAUserId,
            "BANK",
            null,
            [new CreateOrderItemRequestDto(_factory.Seed.CheckoutVariantId, 1)],
            "12 Nguyễn Huệ, Quận 1, Thành phố Hồ Chí Minh",
            "Cancel payment integration test",
            "FULL",
            "Integration Customer A",
            "0900000001",
            "it.a@example.test"));
        var order = await create.Content.ReadFromJsonAsync<OrderDetailDto>();

        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        Assert.NotNull(order?.Paymenttoken);

        var cancel = await _factory.Client.PostAsJsonAsync(
            $"/api/Orders/{order!.Orderid}/cancel-payment",
            new CancelPaymentRequestDto(order.Paymenttoken!));

        Assert.Equal(HttpStatusCode.OK, cancel.StatusCode);

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
        var persistedOrder = await db.Orders.AsNoTracking().FirstAsync(item => item.Orderid == order.Orderid);
        var inventory = await db.Inventoryitems.AsNoTracking().FirstAsync(item => item.Imei == order.Orderitems!.Single().Imei);
        Assert.Equal("Cancelled", persistedOrder.Orderstatus);
        Assert.Equal("Cancelled", persistedOrder.Paymentstatus);
        Assert.Null(persistedOrder.Paymenttoken);
        Assert.Null(persistedOrder.Reservationexpiresat);
        Assert.Equal("InStock", inventory.Status);
    }
}
