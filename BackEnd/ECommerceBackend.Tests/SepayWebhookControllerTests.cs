using System.Linq;
using ECommerceBackend.Models;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Xunit;
using Microsoft.AspNetCore.TestHost;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Collections.Generic;
using ECommerceBackend.Controllers;

namespace ECommerceBackend.Tests
{
    public class SepayWebhookControllerTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;
        private readonly CustomWebApplicationFactory _factory;

        public SepayWebhookControllerTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
            _client = factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                    services.AddAuthentication("TestScheme")
                        .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                            "TestScheme", options => { });
                });
            }).CreateClient();

            using var scope = factory.Services.CreateScope();
            var configuration = scope.ServiceProvider.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>();
            var apiKey = configuration["Sepay:ApiKey"];
            if (!string.IsNullOrEmpty(apiKey))
            {
                _client.DefaultRequestHeaders.Add("Authorization", $"Apikey {apiKey}");
            }
        }

        private async Task SeedDataAsync()
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
            db.Database.EnsureDeleted();
            db.Database.EnsureCreated();

            // Seed a customer and an order
            db.Customers.Add(new Customer { Customerid = 1, Fullname = "Sepay Test", Email = "sepay@test.com", Phone = "0912345678" });
            db.Orders.Add(new Order
            {
                Orderid = 200,
                Customerid = 1,
                Finalamount = 5000000,
                Paidamount = 0,
                Requiredpayment = 5000000,
                Orderstatus = "Pending",
                Paymentstatus = "AwaitingFullPayment",
                Paymentmethod = "BANK",
                Shippingphone = "0912345678",
                Guesttoken = "guest-sepay-token"
            });

            await db.SaveChangesAsync();
        }

        [Fact]
        public async Task ProcessWebhook_SuccessfulPayment_UpdatesOrderStatus()
        {
            // Arrange
            await SeedDataAsync();
            var payload = new SepayWebhookController.SepayWebhookDto
            {
                Id = 12345,
                TransferType = "in",
                TransferAmount = 5000000,
                Content = "Chuyen khoan don hang CDT200",
                ReferenceCode = "FT123456789"
            };

            // Act
            var response = await _client.PostAsJsonAsync("/api/SepayWebhook", payload);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            // Verify order update in DB
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
            var order = await db.Orders
                .Include(o => o.Orderpayments)
                .FirstOrDefaultAsync(o => o.Orderid == 200);

            Assert.NotNull(order);
            Assert.Equal("Paid", order.Paymentstatus);
            Assert.Equal(5000000, order.Paidamount);
            
            var paymentsList = order.Orderpayments.ToList();
            Assert.Single(paymentsList);
            Assert.Equal("Success", paymentsList[0].Status);
            Assert.Equal("FT123456789", paymentsList[0].Transactionref);
        }

        [Fact]
        public async Task ProcessWebhook_SkippedOutbound_ReturnsOkNoChanges()
        {
            // Arrange
            await SeedDataAsync();
            var payload = new SepayWebhookController.SepayWebhookDto
            {
                Id = 12346,
                TransferType = "out", // Money leaving
                TransferAmount = 100000,
                Content = "CDT200 refund"
            };

            // Act
            var response = await _client.PostAsJsonAsync("/api/SepayWebhook", payload);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
            var order = await db.Orders.FirstOrDefaultAsync(o => o.Orderid == 200);
            Assert.Equal(0, order!.Paidamount);
            Assert.Equal("AwaitingFullPayment", order.Paymentstatus);
        }

        [Fact]
        public async Task ProcessWebhook_InvalidCode_ReturnsBadRequest()
        {
            // Arrange
            await SeedDataAsync();
            var payload = new SepayWebhookController.SepayWebhookDto
            {
                Id = 12347,
                TransferType = "in",
                TransferAmount = 500000,
                Content = "Chuyen khoan mua hang" // No CDT code
            };

            // Act
            var response = await _client.PostAsJsonAsync("/api/SepayWebhook", payload);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task ProcessWebhook_OrderNotFound_ReturnsNotFound()
        {
            // Arrange
            await SeedDataAsync();
            var payload = new SepayWebhookController.SepayWebhookDto
            {
                Id = 12348,
                TransferType = "in",
                TransferAmount = 500000,
                Content = "Chuyen hang cho CDT999" // Non-existent order
            };

            // Act
            var response = await _client.PostAsJsonAsync("/api/SepayWebhook", payload);

            // Assert
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }
    }
}
