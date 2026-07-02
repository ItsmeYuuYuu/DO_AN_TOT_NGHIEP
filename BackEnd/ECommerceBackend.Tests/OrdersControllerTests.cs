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
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text.Encodings.Web;
using ECommerceBackend.DTOs.Inventory;
using ECommerceBackend.DTOs.Cart;
using ECommerceBackend.DTOs.Shipping;

namespace ECommerceBackend.Tests
{
    // Dummy authentication handler for testing
    public class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public TestAuthHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder)
            : base(options, logger, encoder)
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
                claims[2] = new Claim(ClaimTypes.Role, testRole.ToString());
            }
            if (Context.Request.Headers.TryGetValue("X-Test-UserId", out var testUserId))
            {
                claims[1] = new Claim("userid", testUserId.ToString());
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
        public async Task GetLowStock_ReturnsVariantsAtOrBelowThreshold()
        {
            await SeedDataAsync();
            _client.DefaultRequestHeaders.Add("X-Test-Role", "Warehouse");

            var response = await _client.GetAsync("/api/Inventory/low-stock?threshold=2");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var items = await response.Content.ReadFromJsonAsync<List<LowStockVariantDto>>();
            var item = Assert.Single(items!);
            Assert.Equal(10, item.Variantid);
            Assert.Equal(2, item.InStockQuantity);
            Assert.Equal(2, item.Threshold);
        }

        [Fact]
        public async Task AddToCart_WhenQuantityExceedsStock_ReturnsConflict()
        {
            await SeedDataAsync();
            _client.DefaultRequestHeaders.Add("X-Test-UserId", "1");

            var response = await _client.PostAsJsonAsync(
                "/api/Cart/add",
                new AddToCartDto(10, 3));

            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
            Assert.Empty(db.Cartitems);
        }

        [Fact]
        public async Task CreateProduct_WhenVariantAllocationDiffersFromBatch_ReturnsBadRequest()
        {
            await SeedDataAsync();
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
                db.Categories.Add(new Category { Categoryid = 50, Categoryname = "Điện thoại" });
                db.Brands.Add(new Brand { Brandid = 50, Brandname = "Test Brand" });
                await db.SaveChangesAsync();
            }
            _client.DefaultRequestHeaders.Add("X-Test-Role", "Admin");

            var response = await _client.PostAsJsonAsync("/api/Products/full", new
            {
                productname = "Test Batch Product",
                categoryid = 50,
                brandid = 50,
                totalquantity = 2,
                variants = new[]
                {
                    new
                    {
                        condition = "New Seal",
                        sku = "TEST-BATCH-001",
                        baseprice = 10_000_000,
                        quantity = 3,
                        images = new[]
                        {
                            new { imageurl = "https://example.com/product.jpg", ismain = true }
                        }
                    }
                }
            });

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task CreateProduct_WhenVariantAllocationMatchesBatch_CreatesExactInventory()
        {
            await SeedDataAsync();
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
                db.Categories.Add(new Category { Categoryid = 51, Categoryname = "Test Category" });
                db.Brands.Add(new Brand { Brandid = 51, Brandname = "Allocation Brand" });
                await db.SaveChangesAsync();
            }
            _client.DefaultRequestHeaders.Add("X-Test-Role", "Admin");

            var response = await _client.PostAsJsonAsync("/api/Products/full", new
            {
                productname = "Allocated Batch Product",
                categoryid = 51,
                brandid = 51,
                totalquantity = 4,
                variants = new[]
                {
                    new
                    {
                        condition = "New Seal",
                        sku = "ALLOCATED-BATCH-001",
                        baseprice = 10_000_000,
                        quantity = 1,
                        images = new[]
                        {
                            new { imageurl = "https://example.com/product-1.jpg", ismain = true }
                        }
                    },
                    new
                    {
                        condition = "Likenew",
                        sku = "ALLOCATED-BATCH-002",
                        baseprice = 9_000_000,
                        quantity = 3,
                        images = new[]
                        {
                            new { imageurl = "https://example.com/product-2.jpg", ismain = true }
                        }
                    }
                }
            });

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);

            using var verificationScope = _factory.Services.CreateScope();
            var verificationDb = verificationScope.ServiceProvider.GetRequiredService<ECommerceContext>();
            var variantIds = await verificationDb.Productvariants
                .Where(item => item.Sku == "ALLOCATED-BATCH-001" || item.Sku == "ALLOCATED-BATCH-002")
                .Select(item => item.Variantid)
                .ToListAsync();
            var inventoryCount = await verificationDb.Inventoryitems
                .CountAsync(item => item.Variantid.HasValue && variantIds.Contains(item.Variantid.Value));

            Assert.Equal(2, variantIds.Count);
            Assert.Equal(4, inventoryCount);
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
                "Note",
                Customername: "Test User",
                Customerphone: "0911111111",
                Customeremail: "test@test.com"
            );

            _client.DefaultRequestHeaders.Add("X-Test-UserId", "1");
            var response = await _client.PostAsJsonAsync("/api/Orders", req);
            
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            var order = await response.Content.ReadFromJsonAsync<OrderDetailDto>();
            Assert.NotNull(order);
            Assert.Equal(1800, order.Totalamount); // 2 * 900
            Assert.Equal(180, order.Discountamount); // 10% of 1800
            Assert.Equal(1620, order.Finalamount);
            Assert.Equal("Registered", order.Checkouttype);
            Assert.Equal("CODPending", order.Paymentstatus);

            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
            var stock = db.Inventoryitems.Count(i => i.Status == "InStock");
            var reserved = db.Inventoryitems.Count(i => i.Status == "Reserved");
            Assert.Equal(0, stock); // 2 items were reserved for the order
            Assert.Equal(2, reserved);
            Assert.Equal(2, db.Inventorytransactions.Count(item =>
                item.Orderid == order.Orderid &&
                item.Transactiontype == "Reserve" &&
                item.Tostatus == "Reserved"));
        }

        [Fact]
        public async Task PostOrder_FromChatRecommendation_RecordsOrderAttribution()
        {
            await SeedDataAsync();
            int recommendationId;
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
                var product = new Product
                {
                    Productid = 1,
                    Productname = "Attributed Phone",
                    Createdat = DateTime.UtcNow
                };
                var variant = db.Productvariants.Single(item => item.Variantid == 10);
                variant.Productid = product.Productid;
                var session = new Chatsession
                {
                    Customerid = 1,
                    Starttime = DateTime.UtcNow,
                    Status = "Attributed chat"
                };
                var message = new Chatmessage
                {
                    Session = session,
                    Sendertype = "assistant",
                    Messagecontent = "Recommended product",
                    Sentat = DateTime.UtcNow
                };
                var createdRecommendation = new Chatproductrecommendation
                {
                    Message = message,
                    Productid = product.Productid,
                    Variantid = variant.Variantid,
                    Rank = 1,
                    Createdat = DateTime.UtcNow,
                    Addedtocartat = DateTime.UtcNow
                };
                db.Products.Add(product);
                db.Chatproductrecommendations.Add(createdRecommendation);
                await db.SaveChangesAsync();
                recommendationId = createdRecommendation.Recommendationid;
            }

            _client.DefaultRequestHeaders.Add("X-Test-UserId", "1");
            var response = await _client.PostAsJsonAsync("/api/Orders", new CreateOrderRequestDto(
                null,
                "COD",
                null,
                new List<CreateOrderItemRequestDto> { new(10, 1) },
                "123 Street",
                "Chat-attributed order",
                Customername: "Test User",
                Customerphone: "0912345678",
                Customeremail: "test@test.com"));
            var order = await response.Content.ReadFromJsonAsync<OrderDetailDto>();

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            Assert.NotNull(order);

            using var verifyScope = _factory.Services.CreateScope();
            var verifyDb = verifyScope.ServiceProvider.GetRequiredService<ECommerceContext>();
            var attributedRecommendation = verifyDb.Chatproductrecommendations
                .Single(item => item.Recommendationid == recommendationId);
            Assert.Equal(order.Orderid, attributedRecommendation.Orderid);
            Assert.NotNull(attributedRecommendation.Orderedat);
        }

        [Fact]
        public async Task PostOrder_Fail_NotEnoughStock()
        {
            await SeedDataAsync();

            var req = new CreateOrderRequestDto(
                null, "COD", null,
                new List<CreateOrderItemRequestDto> { new CreateOrderItemRequestDto(10, 5) },
                "123 Street", null,
                Customername: "Test User",
                Customerphone: "0922222222",
                Customeremail: "test@test.com"
            );

            _client.DefaultRequestHeaders.Add("X-Test-UserId", "1");
            var response = await _client.PostAsJsonAsync("/api/Orders", req);
            
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            var err = await response.Content.ReadFromJsonAsync<ApiErrorDto>();
            Assert.Contains("không đủ tồn kho", err!.Message);
        }

        [Fact]
        public async Task PostOrder_Fail_PrivilegeEscalation()
        {
            await SeedDataAsync();

            var req = new CreateOrderRequestDto(
                2, // Attempt to create for Userid = 2
                "COD", null,
                new List<CreateOrderItemRequestDto> { new CreateOrderItemRequestDto(10, 1) },
                "123 Street", null,
                Customername: "Test User",
                Customerphone: "0933333333",
                Customeremail: "test@test.com"
            );

            _client.DefaultRequestHeaders.Add("X-Test-UserId", "1");
            _client.DefaultRequestHeaders.Add("X-Test-Role", "Customer");

            var response = await _client.PostAsJsonAsync("/api/Orders", req);
            
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task PostOrder_GuestCannotUseCod()
        {
            await SeedDataAsync();
            using var anonymousClient = _factory.CreateClient();

            var req = new CreateOrderRequestDto(
                null,
                "COD",
                null,
                new List<CreateOrderItemRequestDto> { new CreateOrderItemRequestDto(10, 1) },
                "123 Street",
                "Guest note",
                Paymentoption: "Deposit30",
                Customername: "Guest Buyer",
                Customerphone: "0944444444",
                Customeremail: "guest@test.com"
            );

            var response = await anonymousClient.PostAsJsonAsync("/api/Orders", req);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            var err = await response.Content.ReadFromJsonAsync<ApiErrorDto>();
            Assert.Contains("Khách vãng lai không thể chọn COD", err!.Message);
        }

        [Fact]
        public async Task PostOrder_GuestDeposit_ReservesInventoryAndRequiresThirtyPercent()
        {
            await SeedDataAsync();
            using var anonymousClient = _factory.CreateClient();
            anonymousClient.DefaultRequestHeaders.Add("x-guest-session-token", "guest-checkout-test");

            var req = new CreateOrderRequestDto(
                null,
                "MOMO",
                null,
                new List<CreateOrderItemRequestDto> { new CreateOrderItemRequestDto(10, 1) },
                "123 Street",
                "Guest deposit",
                Paymentoption: "Deposit30",
                Customername: "Guest Buyer",
                Customerphone: "0955555555",
                Customeremail: "guest-deposit@test.com"
            );

            var response = await anonymousClient.PostAsJsonAsync("/api/Orders", req);

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            var order = await response.Content.ReadFromJsonAsync<OrderDetailDto>();
            Assert.NotNull(order);
            Assert.Equal("Guest", order.Checkouttype);
            Assert.Equal("AwaitingDeposit", order.Paymentstatus);
            Assert.Equal(270, order.Requiredpayment);
            Assert.Equal(30, order.Depositpercentage);
            Assert.False(string.IsNullOrWhiteSpace(order.Paymenttoken));
            Assert.NotNull(order.Reservationexpiresat);

            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
            Assert.Equal(1, db.Inventoryitems.Count(i => i.Status == "Reserved"));
        }

        [Fact]
        public async Task SimulatePayment_GuestDeposit_MarksDepositPaidAndAllowsProcessing()
        {
            await SeedDataAsync();
            using var anonymousClient = _factory.CreateClient();
            anonymousClient.DefaultRequestHeaders.Add("x-guest-session-token", "guest-payment-success");

            var createResponse = await anonymousClient.PostAsJsonAsync("/api/Orders", new CreateOrderRequestDto(
                null,
                "MOMO",
                null,
                new List<CreateOrderItemRequestDto> { new CreateOrderItemRequestDto(10, 1) },
                "123 Street",
                "Guest deposit",
                Paymentoption: "Deposit30",
                Customername: "Guest Buyer",
                Customerphone: "0961111111",
                Customeremail: "guest-payment@test.com"
            ));
            var order = await createResponse.Content.ReadFromJsonAsync<OrderDetailDto>();
            Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
            Assert.NotNull(order);

            var paymentResponse = await anonymousClient.PostAsJsonAsync(
                $"/api/Orders/{order.Orderid}/simulate-payment",
                new SimulatePaymentRequestDto(order.Paymenttoken!, true));
            var payment = await paymentResponse.Content.ReadFromJsonAsync<PaymentActionResultDto>();

            Assert.Equal(HttpStatusCode.OK, paymentResponse.StatusCode);
            Assert.NotNull(payment);
            Assert.Equal("DepositPaid", payment.Paymentstatus);
            Assert.Equal(270, payment.Paidamount);

            _client.DefaultRequestHeaders.Add("X-Test-Role", "Admin");
            var statusResponse = await _client.PatchAsJsonAsync(
                $"/api/Orders/{order.Orderid}/status",
                new UpdateOrderStatusRequestDto("Processing"));

            Assert.Equal(HttpStatusCode.OK, statusResponse.StatusCode);
        }

        [Fact]
        public async Task SimulatePayment_GuestFullPayment_MarksOrderPaid()
        {
            await SeedDataAsync();
            using var anonymousClient = _factory.CreateClient();
            anonymousClient.DefaultRequestHeaders.Add("x-guest-session-token", "guest-full-payment");

            var createResponse = await anonymousClient.PostAsJsonAsync("/api/Orders", new CreateOrderRequestDto(
                null,
                "VNPAY",
                null,
                new List<CreateOrderItemRequestDto> { new CreateOrderItemRequestDto(10, 1) },
                "123 Street",
                "Guest full payment",
                Paymentoption: "Full",
                Customername: "Guest Buyer",
                Customerphone: "0961212121",
                Customeremail: "guest-full@test.com"
            ));
            var order = await createResponse.Content.ReadFromJsonAsync<OrderDetailDto>();
            Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
            Assert.NotNull(order);
            Assert.Equal("AwaitingFullPayment", order.Paymentstatus);
            Assert.Equal(order.Finalamount, order.Requiredpayment);

            var paymentResponse = await anonymousClient.PostAsJsonAsync(
                $"/api/Orders/{order.Orderid}/simulate-payment",
                new SimulatePaymentRequestDto(order.Paymenttoken!, true));
            var payment = await paymentResponse.Content.ReadFromJsonAsync<PaymentActionResultDto>();

            Assert.Equal(HttpStatusCode.OK, paymentResponse.StatusCode);
            Assert.NotNull(payment);
            Assert.Equal("Paid", payment.Paymentstatus);
            Assert.Equal(order.Finalamount, payment.Paidamount);
            Assert.Equal(0, payment.Remainingamount);
        }

        [Fact]
        public async Task PatchOrderStatus_UnpaidOnlineOrder_RejectsProcessing()
        {
            await SeedDataAsync();
            using var anonymousClient = _factory.CreateClient();
            anonymousClient.DefaultRequestHeaders.Add("x-guest-session-token", "guest-unpaid-processing");

            var createResponse = await anonymousClient.PostAsJsonAsync("/api/Orders", new CreateOrderRequestDto(
                null,
                "VNPAY",
                null,
                new List<CreateOrderItemRequestDto> { new CreateOrderItemRequestDto(10, 1) },
                "123 Street",
                null,
                Paymentoption: "Full",
                Customername: "Guest Buyer",
                Customerphone: "0962222222",
                Customeremail: "guest-unpaid@test.com"
            ));
            var order = await createResponse.Content.ReadFromJsonAsync<OrderDetailDto>();
            Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
            Assert.NotNull(order);

            _client.DefaultRequestHeaders.Add("X-Test-Role", "Admin");
            var statusResponse = await _client.PatchAsJsonAsync(
                $"/api/Orders/{order.Orderid}/status",
                new UpdateOrderStatusRequestDto("Processing"));

            Assert.Equal(HttpStatusCode.BadRequest, statusResponse.StatusCode);
            var error = await statusResponse.Content.ReadFromJsonAsync<ApiErrorDto>();
            Assert.Contains("chưa đặt cọc", error!.Message);
        }

        [Fact]
        public async Task GetPaymentCheckout_ExpiredOrder_CancelsAndRestoresInventory()
        {
            await SeedDataAsync();
            using var anonymousClient = _factory.CreateClient();
            anonymousClient.DefaultRequestHeaders.Add("x-guest-session-token", "guest-expired-payment");

            var createResponse = await anonymousClient.PostAsJsonAsync("/api/Orders", new CreateOrderRequestDto(
                null,
                "BANK",
                null,
                new List<CreateOrderItemRequestDto> { new CreateOrderItemRequestDto(10, 1) },
                "123 Street",
                null,
                Paymentoption: "Full",
                Customername: "Guest Buyer",
                Customerphone: "0963333333",
                Customeremail: "guest-expired@test.com"
            ));
            var order = await createResponse.Content.ReadFromJsonAsync<OrderDetailDto>();
            Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
            Assert.NotNull(order);

            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
                var storedOrder = db.Orders.Single(item => item.Orderid == order.Orderid);
                storedOrder.Reservationexpiresat = DateTime.UtcNow.AddMinutes(-1);
                await db.SaveChangesAsync();
            }

            var paymentResponse = await anonymousClient.GetAsync(
                $"/api/Orders/{order.Orderid}/payment?token={order.Paymenttoken}");

            Assert.Equal(HttpStatusCode.Gone, paymentResponse.StatusCode);
            using var verifyScope = _factory.Services.CreateScope();
            var verifyDb = verifyScope.ServiceProvider.GetRequiredService<ECommerceContext>();
            Assert.Equal("Cancelled", verifyDb.Orders.Single(item => item.Orderid == order.Orderid).Orderstatus);
            Assert.Equal(2, verifyDb.Inventoryitems.Count(item => item.Status == "InStock"));
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

        [Fact]
        public async Task PatchOrderStatus_ShippedOrderCannotBeCancelledOrRestocked()
        {
            await SeedDataAsync();

            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
                db.Orders.Add(new Order
                {
                    Orderid = 101,
                    Orderstatus = "Shipped",
                    Paymentmethod = "COD",
                    Paymentstatus = "CODPending",
                    Checkouttype = "Registered",
                    Orderitems = new List<Orderitem> { new Orderitem { Imei = "IMEI1" } }
                });
                db.Inventoryitems.Single(item => item.Imei == "IMEI1").Status = "Shipping";
                await db.SaveChangesAsync();
            }

            _client.DefaultRequestHeaders.Add("X-Test-Role", "Admin");
            var response = await _client.PatchAsJsonAsync(
                "/api/Orders/101/status",
                new UpdateOrderStatusRequestDto("Cancelled"));

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

            using var verifyScope = _factory.Services.CreateScope();
            var verifyDb = verifyScope.ServiceProvider.GetRequiredService<ECommerceContext>();
            Assert.Equal("Shipped", verifyDb.Orders.Single(item => item.Orderid == 101).Orderstatus);
            Assert.Equal("Shipping", verifyDb.Inventoryitems.Single(item => item.Imei == "IMEI1").Status);
        }

        [Fact]
        public async Task OrderAssignment_SecondSalesCannotClaimAssignedOrder()
        {
            await SeedDataAsync();
            _client.DefaultRequestHeaders.Add("X-Test-Role", "Sales");
            _client.DefaultRequestHeaders.Add("X-Test-UserId", "1");

            var firstResponse = await _client.PostAsJsonAsync(
                "/api/OrderAssignments/99/claim",
                new ClaimOrderRequestDto("Sales"));
            Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);

            _client.DefaultRequestHeaders.Remove("X-Test-UserId");
            _client.DefaultRequestHeaders.Add("X-Test-UserId", "2");
            var secondResponse = await _client.PostAsJsonAsync(
                "/api/OrderAssignments/99/claim",
                new ClaimOrderRequestDto("Sales"));

            Assert.Equal(HttpStatusCode.Conflict, secondResponse.StatusCode);
        }

        [Fact]
        public async Task OrderAssignment_SalesHandoffThenWarehouseShips()
        {
            await SeedDataAsync();
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
                var order = db.Orders.Single(item => item.Orderid == 99);
                order.Paymentmethod = "COD";
                order.Checkouttype = "Registered";
                order.Paymentstatus = "CODPending";
                order.Orderitems.Add(new Orderitem
                {
                    Imei = "IMEI1",
                    Sellingprice = 900
                });
                db.Inventoryitems.Single(item => item.Imei == "IMEI1").Status = "Reserved";
                await db.SaveChangesAsync();
            }

            _client.DefaultRequestHeaders.Add("X-Test-Role", "Sales");
            _client.DefaultRequestHeaders.Add("X-Test-UserId", "1");
            var claimSales = await _client.PostAsJsonAsync(
                "/api/OrderAssignments/99/claim",
                new ClaimOrderRequestDto("Sales"));
            Assert.Equal(HttpStatusCode.OK, claimSales.StatusCode);

            var handoff = await _client.PostAsJsonAsync(
                "/api/OrderAssignments/99/handoff-to-warehouse",
                new HandoffOrderRequestDto("Da xac nhan don."));
            Assert.Equal(HttpStatusCode.OK, handoff.StatusCode);

            _client.DefaultRequestHeaders.Remove("X-Test-Role");
            _client.DefaultRequestHeaders.Add("X-Test-Role", "Warehouse");
            _client.DefaultRequestHeaders.Remove("X-Test-UserId");
            _client.DefaultRequestHeaders.Add("X-Test-UserId", "2");

            var claimWarehouse = await _client.PostAsJsonAsync(
                "/api/OrderAssignments/99/claim",
                new ClaimOrderRequestDto("Warehouse"));
            Assert.Equal(HttpStatusCode.OK, claimWarehouse.StatusCode);

            var wrongImei = await _client.PostAsJsonAsync(
                "/api/OrderAssignments/99/mark-shipped",
                new MarkOrderShippedRequestDto(new List<string> { "WRONG-IMEI" }));
            Assert.Equal(HttpStatusCode.BadRequest, wrongImei.StatusCode);

            var shipped = await _client.PostAsJsonAsync(
                "/api/OrderAssignments/99/mark-shipped",
                new MarkOrderShippedRequestDto(new List<string> { "IMEI1" }, "Da doi chieu."));
            Assert.Equal(HttpStatusCode.OK, shipped.StatusCode);

            using var verifyScope = _factory.Services.CreateScope();
            var verifyDb = verifyScope.ServiceProvider.GetRequiredService<ECommerceContext>();
            Assert.Equal("Shipped", verifyDb.Orders.Single(item => item.Orderid == 99).Orderstatus);
            Assert.Equal(
                "Completed",
                verifyDb.Orderassignments.Single(item =>
                    item.Orderid == 99 && item.Department == "Warehouse").Status);
            Assert.Equal("Shipping", verifyDb.Inventoryitems.Single(item => item.Imei == "IMEI1").Status);
            var shipment = verifyDb.Shipments.Single(item => item.Orderid == 99);
            Assert.Equal("GHN", shipment.Carrier);
            Assert.Equal("AwaitingPickup", shipment.Status);
            Assert.StartsWith("GHN-DEMO-", shipment.Trackingcode);
            Assert.Contains(verifyDb.Inventorytransactions, item =>
                item.Orderid == 99 &&
                item.Imei == "IMEI1" &&
                item.Transactiontype == "Ship" &&
                item.Fromstatus == "Reserved" &&
                item.Tostatus == "Shipping");
        }

        [Fact]
        public async Task RegisteredCod_FullWorkflow_CompletesSaleAndActivatesWarranty()
        {
            await SeedDataAsync();
            _client.DefaultRequestHeaders.Add("X-Test-Role", "Customer");
            _client.DefaultRequestHeaders.Add("X-Test-UserId", "1");

            var createResponse = await _client.PostAsJsonAsync("/api/Orders", new CreateOrderRequestDto(
                null,
                "COD",
                null,
                new List<CreateOrderItemRequestDto> { new CreateOrderItemRequestDto(10, 1) },
                "123 Street",
                "End-to-end COD order",
                Customername: "Test User",
                Customerphone: "0977777777",
                Customeremail: "test@test.com"
            ));
            var order = await createResponse.Content.ReadFromJsonAsync<OrderDetailDto>();
            Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
            Assert.NotNull(order);
            var imei = Assert.Single(order.Orderitems!).Imei;
            Assert.False(string.IsNullOrWhiteSpace(imei));

            _client.DefaultRequestHeaders.Remove("X-Test-Role");
            _client.DefaultRequestHeaders.Add("X-Test-Role", "Sales");
            var claimSales = await _client.PostAsJsonAsync(
                $"/api/OrderAssignments/{order.Orderid}/claim",
                new ClaimOrderRequestDto("Sales"));
            Assert.Equal(HttpStatusCode.OK, claimSales.StatusCode);

            var handoff = await _client.PostAsJsonAsync(
                $"/api/OrderAssignments/{order.Orderid}/handoff-to-warehouse",
                new HandoffOrderRequestDto("Sales confirmed the COD order."));
            Assert.Equal(HttpStatusCode.OK, handoff.StatusCode);

            _client.DefaultRequestHeaders.Remove("X-Test-Role");
            _client.DefaultRequestHeaders.Add("X-Test-Role", "Warehouse");
            _client.DefaultRequestHeaders.Remove("X-Test-UserId");
            _client.DefaultRequestHeaders.Add("X-Test-UserId", "2");
            var claimWarehouse = await _client.PostAsJsonAsync(
                $"/api/OrderAssignments/{order.Orderid}/claim",
                new ClaimOrderRequestDto("Warehouse"));
            Assert.Equal(HttpStatusCode.OK, claimWarehouse.StatusCode);

            var shipped = await _client.PostAsJsonAsync(
                $"/api/OrderAssignments/{order.Orderid}/mark-shipped",
                new MarkOrderShippedRequestDto(new List<string> { imei! }, "IMEI verified."));
            Assert.Equal(HttpStatusCode.OK, shipped.StatusCode);

            _client.DefaultRequestHeaders.Remove("X-Test-Role");
            _client.DefaultRequestHeaders.Add("X-Test-Role", "Admin");
            int shipmentId;
            using (var shipmentScope = _factory.Services.CreateScope())
            {
                shipmentId = shipmentScope.ServiceProvider.GetRequiredService<ECommerceContext>()
                    .Shipments.Single(item => item.Orderid == order.Orderid).Shipmentid;
            }
            foreach (var status in new[] { "PickedUp", "InTransit", "OutForDelivery", "Delivered" })
            {
                var completed = await _client.PatchAsJsonAsync(
                    $"/api/Shipments/{shipmentId}/status",
                    new UpdateShipmentStatusDto(status));
                Assert.Equal(HttpStatusCode.OK, completed.StatusCode);
            }

            using var verifyScope = _factory.Services.CreateScope();
            var verifyDb = verifyScope.ServiceProvider.GetRequiredService<ECommerceContext>();
            var storedOrder = verifyDb.Orders.Single(item => item.Orderid == order.Orderid);
            var inventory = verifyDb.Inventoryitems.Single(item => item.Imei == imei);

            Assert.Equal("Completed", storedOrder.Orderstatus);
            Assert.Equal("Paid", storedOrder.Paymentstatus);
            Assert.Equal(storedOrder.Finalamount, storedOrder.Paidamount);
            Assert.Equal("Sold", inventory.Status);
            Assert.Equal("Active", inventory.Warrantystatus);
            Assert.NotNull(inventory.Warrantystartdate);
            Assert.NotNull(inventory.Warrantyenddate);
            Assert.InRange(
                (inventory.Warrantyenddate!.Value - inventory.Warrantystartdate!.Value).TotalDays,
                364,
                367);
            Assert.Contains(verifyDb.Inventorytransactions, item =>
                item.Orderid == order.Orderid &&
                item.Imei == imei &&
                item.Transactiontype == "CompleteSale" &&
                item.Fromstatus == "Shipping" &&
                item.Tostatus == "Sold");
        }
    }
}
