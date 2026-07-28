using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using ECommerceBackend.DTOs.Orders;
using ECommerceBackend.IntegrationTests.Infrastructure;
using ECommerceBackend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ECommerceBackend.IntegrationTests;

public sealed class SecurityHardeningTests : IClassFixture<IntegrationTestFactory>
{
    private readonly IntegrationTestFactory _factory;

    public SecurityHardeningTests(IntegrationTestFactory factory) => _factory = factory;

    [Fact]
    public async Task Login_Is_Rate_Limited_By_Client_Ip()
    {
        using var client = _factory.CreateClient();

        for (var attempt = 0; attempt < 10; attempt++)
        {
            var response = await client.PostAsJsonAsync("/api/Auth/login", new
            {
                username = $"unknown-{attempt}",
                password = "incorrect"
            });
            Assert.NotEqual(HttpStatusCode.TooManyRequests, response.StatusCode);
        }

        var blocked = await client.PostAsJsonAsync("/api/Auth/login", new
        {
            username = "unknown-blocked",
            password = "incorrect"
        });

        Assert.Equal(HttpStatusCode.TooManyRequests, blocked.StatusCode);
    }

    [Fact]
    public async Task Registration_Otp_Is_Rate_Limited_By_Client_Ip()
    {
        using var client = _factory.CreateClient();

        for (var attempt = 0; attempt < 5; attempt++)
        {
            var response = await client.PostAsJsonAsync("/api/Auth/registration-code", new
            {
                email = $"otp-{attempt}@example.test"
            });
            Assert.NotEqual(HttpStatusCode.TooManyRequests, response.StatusCode);
        }

        var blocked = await client.PostAsJsonAsync("/api/Auth/registration-code", new
        {
            email = "otp-blocked@example.test"
        });

        Assert.Equal(HttpStatusCode.TooManyRequests, blocked.StatusCode);
    }

}

public sealed class SepayWebhookSecurityTests : IClassFixture<IntegrationTestFactory>
{
    private readonly IntegrationTestFactory _factory;

    public SepayWebhookSecurityTests(IntegrationTestFactory factory) => _factory = factory;

    [Fact]
    public async Task Webhook_Requires_Exact_Key_And_Processes_Transaction_Once()
    {
        using var customer = await _factory.CreateAuthenticatedClientAsync("it_customer_a");
        var create = await customer.PostAsJsonAsync("/api/Orders", new CreateOrderRequestDto(
            _factory.Seed.CustomerAUserId,
            "BANK",
            null,
            [new CreateOrderItemRequestDto(_factory.Seed.CheckoutVariantId, 1)],
            "12 Nguyen Hue, Quan 1, Thanh pho Ho Chi Minh",
            "SePay idempotency integration test",
            "FULL",
            "Integration Customer A",
            "0900000001",
            "it.a@example.test"));
        var order = await create.Content.ReadFromJsonAsync<OrderDetailDto>();

        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        Assert.NotNull(order);

        var payload = new
        {
            id = 987654321L,
            transferType = "in",
            transferAmount = order!.Requiredpayment,
            content = $"CDT{order.Orderid:D3} THANH TOAN DON HANG",
            referenceCode = "INTEGRATION-REFERENCE"
        };

        using var webhookClient = _factory.CreateClient();
        webhookClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Apikey", "prefix-integration-sepay-key-suffix");
        var unauthorized = await webhookClient.PostAsJsonAsync("/api/SepayWebhook", payload);
        Assert.Equal(HttpStatusCode.Unauthorized, unauthorized.StatusCode);

        webhookClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Apikey", "integration-sepay-key");
        var first = await webhookClient.PostAsJsonAsync("/api/SepayWebhook", payload);
        var duplicate = await webhookClient.PostAsJsonAsync("/api/SepayWebhook", payload);

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, duplicate.StatusCode);

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
        var persistedOrder = await db.Orders
            .AsNoTracking()
            .Include(item => item.Orderpayments)
            .SingleAsync(item => item.Orderid == order.Orderid);

        Assert.Equal(order.Requiredpayment, persistedOrder.Paidamount);
        Assert.Single(persistedOrder.Orderpayments, item =>
            item.Provider == "SEPAY" &&
            item.Status == "Success" &&
            item.Transactionref == "SEPAY-987654321");
    }
}
