using System.Net;
using System.Net.Http.Json;
using ECommerceBackend.DTOs.Chats;
using ECommerceBackend.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Text.Json;
using ECommerceBackend.Services.Chat;

namespace ECommerceBackend.Tests;

public class ChatSessionsControllerTests : IClassFixture<CustomWebApplicationFactory>, IDisposable
{
    private const string GuestToken = "consultant-flow-guest";
    private readonly WebApplicationFactory<Program> _application;
    private readonly HttpClient _client;

    public ChatSessionsControllerTests(CustomWebApplicationFactory factory)
    {
        _application = factory.WithWebHostBuilder(builder =>
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
        });

        _client = _application.CreateClient();
        _client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("TestScheme");
    }

    private async Task<int> SeedSessionAsync()
    {
        using var scope = _application.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
        await db.Database.EnsureDeletedAsync();
        await db.Database.EnsureCreatedAsync();

        db.Roles.Add(new Role { Roleid = 9, Rolename = "Consultant" });
        db.Users.AddRange(
            new User
            {
                Userid = 10,
                Roleid = 9,
                Username = "consultant-a",
                Passwordhash = "hash",
                Fullname = "Consultant A",
                Isactive = true
            },
            new User
            {
                Userid = 11,
                Roleid = 9,
                Username = "consultant-b",
                Passwordhash = "hash",
                Fullname = "Consultant B",
                Isactive = true
            });

        var session = new Chatsession
        {
            Guestsessiontoken = GuestToken,
            Starttime = DateTime.Now,
            Status = "Tư vấn sản phẩm"
        };
        db.Chatsessions.Add(session);
        await db.SaveChangesAsync();
        return session.Sessionid;
    }

    private static HttpRequestMessage CreatePost(
        string url,
        string role,
        int userId,
        object? body = null,
        bool includeGuestToken = false)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(body ?? new { })
        };
        request.Headers.Add("X-Test-Role", role);
        request.Headers.Add("X-Test-UserId", userId.ToString());
        if (includeGuestToken)
        {
            request.Headers.Add("x-guest-session-token", GuestToken);
        }
        return request;
    }

    [Fact]
    public async Task Handoff_FullLifecycle_EnforcesAssignedConsultant()
    {
        var sessionId = await SeedSessionAsync();

        using var handoffRequest = CreatePost(
            $"/api/chatsessions/{sessionId}/handoff",
            "Customer",
            1,
            includeGuestToken: true);
        var handoffResponse = await _client.SendAsync(handoffRequest);
        Assert.Equal(HttpStatusCode.OK, handoffResponse.StatusCode);
        var waitingSession = await handoffResponse.Content.ReadFromJsonAsync<ChatSessionDto>();
        Assert.Equal("Waiting", waitingSession?.Handoffstatus);

        using var acceptRequest = CreatePost(
            $"/api/chatsessions/{sessionId}/accept",
            "Consultant",
            10);
        var acceptResponse = await _client.SendAsync(acceptRequest);
        Assert.Equal(HttpStatusCode.OK, acceptResponse.StatusCode);
        var acceptedSession = await acceptResponse.Content.ReadFromJsonAsync<ChatSessionDto>();
        Assert.Equal("InProgress", acceptedSession?.Handoffstatus);
        Assert.Equal(10, acceptedSession?.Assigneduserid);

        using var messageRequest = CreatePost(
            $"/api/chatsessions/{sessionId}/consultant-messages",
            "Consultant",
            10,
            new CreateChatMessageRequestDto { Messagecontent = "Tôi có thể hỗ trợ anh/chị." });
        var messageResponse = await _client.SendAsync(messageRequest);
        Assert.Equal(HttpStatusCode.OK, messageResponse.StatusCode);

        using var otherConsultantRequest = CreatePost(
            $"/api/chatsessions/{sessionId}/consultant-messages",
            "Consultant",
            11,
            new CreateChatMessageRequestDto { Messagecontent = "Tin nhắn không hợp lệ." });
        var otherConsultantResponse = await _client.SendAsync(otherConsultantRequest);
        Assert.Equal(HttpStatusCode.Forbidden, otherConsultantResponse.StatusCode);

        using var closeRequest = CreatePost(
            $"/api/chatsessions/{sessionId}/close-handoff",
            "Consultant",
            10);
        var closeResponse = await _client.SendAsync(closeRequest);
        Assert.Equal(HttpStatusCode.OK, closeResponse.StatusCode);
        var closedSession = await closeResponse.Content.ReadFromJsonAsync<ChatSessionDto>();
        Assert.Equal("Closed", closedSession?.Handoffstatus);
    }

    [Fact]
    public async Task AcceptHandoff_WhenTwoConsultantsCompete_OnlyOneSucceeds()
    {
        var sessionId = await SeedSessionAsync();

        using (var handoffRequest = CreatePost(
                   $"/api/chatsessions/{sessionId}/handoff",
                   "Customer",
                   1,
                   includeGuestToken: true))
        {
            var handoffResponse = await _client.SendAsync(handoffRequest);
            Assert.Equal(HttpStatusCode.OK, handoffResponse.StatusCode);
        }

        using var firstRequest = CreatePost(
            $"/api/chatsessions/{sessionId}/accept",
            "Consultant",
            10);
        using var secondRequest = CreatePost(
            $"/api/chatsessions/{sessionId}/accept",
            "Consultant",
            11);

        var responses = await Task.WhenAll(
            _client.SendAsync(firstRequest),
            _client.SendAsync(secondRequest));

        Assert.Single(responses, response => response.StatusCode == HttpStatusCode.OK);
        Assert.Single(responses, response => response.StatusCode == HttpStatusCode.Conflict);

        using var scope = _application.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
        var session = await db.Chatsessions.AsNoTracking().SingleAsync(item => item.Sessionid == sessionId);
        Assert.Equal("InProgress", session.Handoffstatus);
        Assert.Contains(session.Assigneduserid, new int?[] { 10, 11 });
    }

    [Fact]
    public async Task PostMessage_WithCatalogCriteria_ReturnsGroundedProductAnswer()
    {
        var sessionId = await SeedSessionAsync();
        using (var scope = _application.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
            var brand = new Brand { Brandid = 20, Brandname = "Xiaomi" };
            var category = new Category { Categoryid = 20, Categoryname = "Điện thoại" };
            var product = new Product
            {
                Productid = 200,
                Brandid = brand.Brandid,
                Categoryid = category.Categoryid,
                Productname = "Xiaomi 14T",
                Description = "Điện thoại hiệu năng cao",
                Createdat = DateTime.Now
            };
            var variant = new Productvariant
            {
                Variantid = 2001,
                Productid = product.Productid,
                Sku = "XIAOMI-14T-12-256",
                Baseprice = 15_000_000,
                Saleprice = 14_000_000,
                Condition = "New Seal",
                Specifications = JsonSerializer.Serialize(new Dictionary<string, string>
                {
                    ["Dung lượng RAM"] = "12GB",
                    ["Bộ nhớ trong"] = "256GB",
                    ["Pin"] = "5000 mAh"
                })
            };
            var secondVariant = new Productvariant
            {
                Variantid = 2002,
                Productid = product.Productid,
                Sku = "XIAOMI-14T-12-512",
                Baseprice = 16_000_000,
                Saleprice = 14_500_000,
                Condition = "Like New",
                Specifications = JsonSerializer.Serialize(new Dictionary<string, string>
                {
                    ["Dung lượng RAM"] = "12GB",
                    ["Bộ nhớ trong"] = "512GB",
                    ["Pin"] = "5000 mAh"
                })
            };

            db.Brands.Add(brand);
            db.Categories.Add(category);
            db.Products.Add(product);
            db.Productvariants.AddRange(variant, secondVariant);
            db.Productimages.Add(new Productimage
            {
                Variantid = variant.Variantid,
                Imageurl = "/uploads/products/xiaomi-14t.jpg",
                Ismain = true
            });
            db.Inventoryitems.Add(new Inventoryitem
            {
                Imei = "CHATBOT-XIAOMI-001",
                Variantid = variant.Variantid,
                Status = "InStock"
            });
            db.Inventoryitems.Add(new Inventoryitem
            {
                Imei = "CHATBOT-XIAOMI-002",
                Variantid = secondVariant.Variantid,
                Status = "InStock"
            });
            await db.SaveChangesAsync();
        }

        using var request = CreatePost(
            $"/api/chatsessions/{sessionId}/messages",
            "Customer",
            1,
            new CreateChatMessageRequestDto
            {
                Messagecontent = "Tìm điện thoại Xiaomi RAM 12GB dưới 15 triệu còn hàng"
            },
            includeGuestToken: true);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var message = await response.Content.ReadFromJsonAsync<ChatMessageDto>();
        Assert.Equal("assistant", message?.Sendertype);
        Assert.Contains("1 sản phẩm với 2 phiên bản", message?.Messagecontent);
        Assert.Contains("Xiaomi 14T", message?.Messagecontent);
        Assert.Contains("14.000.000đ", message?.Messagecontent);
        Assert.Contains("14.500.000đ", message?.Messagecontent);
        Assert.Contains("còn 1 máy", message?.Messagecontent);
        Assert.Contains("/products/200", message?.Messagecontent);
        Assert.Equal(
            1,
            message?.Messagecontent.Split("/products/200").Length - 1);
        Assert.Contains("chỉ hiển thị tối đa 3 sản phẩm", message?.Messagecontent);
        Assert.Equal(2, message?.Recommendations?.Count);
        Assert.All(message!.Recommendations!, item => Assert.Equal(200, item.Productid));
        Assert.Equal(2001, message.Recommendations![0].Variantid);
        Assert.Equal("/uploads/products/xiaomi-14t.jpg", message.Recommendations[0].Imageurl);

        using var trackRequest = CreatePost(
            $"/api/chatsessions/{sessionId}/recommendations/{message.Recommendations[0].Recommendationid}/added-to-cart",
            "Customer",
            1,
            includeGuestToken: true);
        var trackResponse = await _client.SendAsync(trackRequest);
        Assert.Equal(HttpStatusCode.OK, trackResponse.StatusCode);

        using var verifyScope = _application.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<ECommerceContext>();
        var trackedRecommendation = await verifyDb.Chatproductrecommendations
            .SingleAsync(item =>
                item.Recommendationid == message.Recommendations[0].Recommendationid);
        Assert.NotNull(trackedRecommendation.Addedtocartat);
    }

    [Fact]
    public void BuildCatalogResponse_WhenManyProducts_ReturnsOnlyTopThree()
    {
        var products = Enumerable.Range(1, 4)
            .Select(index => new ProductConsultationResult(
                ProductId: index,
                VariantId: index * 10,
                ProductName: $"Test Phone {index}",
                Brand: "Test",
                Category: "Điện thoại",
                Condition: "New Seal",
                Sku: $"TEST-{index}",
                Price: 10_000_000 + index,
                BasePrice: 10_000_000 + index,
                Stock: 1,
                ImageUrl: string.Empty,
                Specifications: new Dictionary<string, string>()))
            .ToList();

        var response = GroundedAiProvider.BuildCatalogResponse(
            "Liệt kê tất cả điện thoại",
            products);

        Assert.Contains("3 sản phẩm với 3 phiên bản", response);
        Assert.Contains("Test Phone 1", response);
        Assert.Contains("Test Phone 3", response);
        Assert.DoesNotContain("Test Phone 4", response);
        Assert.Contains("chỉ hiển thị tối đa 3 sản phẩm", response);
    }

    public void Dispose()
    {
        _client.Dispose();
        _application.Dispose();
    }
}
