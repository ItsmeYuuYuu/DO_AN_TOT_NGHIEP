using ECommerceBackend.Models;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Xunit;
using ECommerceBackend.DTOs.Orders;
using ECommerceBackend.DTOs.Common;
using System.Collections.Generic;
using Microsoft.AspNetCore.TestHost;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text.Encodings.Web;

namespace ECommerceBackend.Tests
{
    // Dummy authentication handler for testing
    public class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public TestAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, 
            ILoggerFactory logger, UrlEncoder encoder, ISystemClock clock)
            : base(options, logger, encoder, clock)
        {
        }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var claims = new[] 
            { 
                new Claim(ClaimTypes.Name, "TestUser"),
                new Claim("userid", "1"),
                new Claim(ClaimTypes.Role, "Customer")
            };
            
            if (Context.Request.Headers.TryGetValue("X-Test-Role", out var testRole))
            {
                claims[2] = new Claim(ClaimTypes.Role, testRole);
            }
            if (Context.Request.Headers.TryGetValue("X-Test-UserId", out var testUserId))
            {
                claims[1] = new Claim("userid", testUserId);
            }

            var identity = new ClaimsIdentity(claims, "Test");
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, "TestScheme");

            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
    }

    public class OrdersControllerTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;
        private readonly CustomWebApplicationFactory _factory;

        public OrdersControllerTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
            _client = factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                    services.AddAuthentication("TestScheme")
                        .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                            "TestScheme", options => { });
                    
                    services.PostConfigure<Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerOptions>(Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme, options =>
                    {
                        options.ForwardDefaultSelector = ctx => "TestScheme";
                    });
                });
            }).CreateClient();
            
            _client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("TestScheme");
        }

        private async Task SeedDataAsync()
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
            db.Database.EnsureDeleted();
            db.Database.EnsureCreated();

            db.Users.Add(new User { Userid = 1, Username = "test", Fullname = "Test User", Passwordhash = "hash", Email = "test@test.com" });
            db.Users.Add(new User { Userid = 2, Username = "admin", Fullname = "Admin", Passwordhash = "hash", Email = "admin@test.com" });
            
            db.Customers.Add(new Customer { Customerid = 1, Fullname = "Test User", Email = "test@test.com", Phone = "123" });
            
            var variant = new Productvariant
            {
                Variantid = 10,
                Sku = "TEST-VARIANT-10",
                Baseprice = 1000,
                Saleprice = 900,
                Condition = "New Seal"
            };
            db.Productvariants.Add(variant);
            
            db.Inventoryitems.Add(new Inventoryitem { Imei = "IMEI1", Variantid = 10, Status = "InStock" });
            db.Inventoryitems.Add(new Inventoryitem { Imei = "IMEI2", Variantid = 10, Status = "InStock" });

            db.Vouchers.Add(new Voucher { Vouchercode = "TEST10", Discountpercentage = 10, Isactive = true });

            db.Orders.Add(new Order { Orderid = 99, Userid = 1, Customerid = 1, Orderstatus = "Pending" });

            await db.SaveChangesAsync();
        }

        [Fact]
        public async Task PostOrder_Success_WithInventoryDeductionAndVoucher()
        {
            await SeedDataAsync();

            var req = new CreateOrderRequestDto(
                null,
                "COD",
                "TEST10",
                new List<CreateOrderItemRequestDto> { new CreateOrderItemRequestDto(10, 2) },
                "123 Street",
                "Note"
            );

            _client.DefaultRequestHeaders.Add("X-Test-UserId", "1");
            var response = await _client.PostAsJsonAsync("/api/Orders", req);
            
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            var order = await response.Content.ReadFromJsonAsync<OrderDetailDto>();
            Assert.NotNull(order);
            Assert.Equal(1800, order.Totalamount); // 2 * 900
            Assert.Equal(180, order.Discountamount); // 10% of 1800
            Assert.Equal(1620, order.Finalamount);

            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
            var stock = db.Inventoryitems.Count(i => i.Status == "InStock");
            Assert.Equal(0, stock); // 2 items were bought
        }

        [Fact]
        public async Task PostOrder_Fail_NotEnoughStock()
        {
            await SeedDataAsync();

            var req = new CreateOrderRequestDto(
                null, "COD", null,
                new List<CreateOrderItemRequestDto> { new CreateOrderItemRequestDto(10, 5) },
                null, null
            );

            _client.DefaultRequestHeaders.Add("X-Test-UserId", "1");
            var response = await _client.PostAsJsonAsync("/api/Orders", req);
            
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            var err = await response.Content.ReadFromJsonAsync<ApiErrorDto>();
            Assert.Contains("không đủ tồn kho", err.Message);
        }

        [Fact]
        public async Task PostOrder_Fail_PrivilegeEscalation()
        {
            await SeedDataAsync();

            var req = new CreateOrderRequestDto(
                2, // Attempt to create for Userid = 2
                "COD", null,
                new List<CreateOrderItemRequestDto> { new CreateOrderItemRequestDto(10, 1) },
                null, null
            );

            _client.DefaultRequestHeaders.Add("X-Test-UserId", "1");
            _client.DefaultRequestHeaders.Add("X-Test-Role", "Customer");

            var response = await _client.PostAsJsonAsync("/api/Orders", req);
            
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task PatchOrderStatus_Cancel_RestoresStock()
        {
            await SeedDataAsync();

            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
                db.Orders.Add(new Order 
                { 
                    Orderid = 100, Orderstatus = "Pending", 
                    Orderitems = new List<Orderitem> { new Orderitem { Imei = "IMEI1" } } 
                });
                var inv = db.Inventoryitems.First(i => i.Imei == "IMEI1");
                inv.Status = "Sold";
                await db.SaveChangesAsync();
            }

            _client.DefaultRequestHeaders.Add("X-Test-Role", "Admin");
            var req = new UpdateOrderStatusRequestDto("Cancelled");
            var response = await _client.PatchAsJsonAsync("/api/Orders/100/status", req);
            
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
                var inv = db.Inventoryitems.First(i => i.Imei == "IMEI1");
                Assert.Equal("InStock", inv.Status); // Restocked
            }
        }
    }
}
