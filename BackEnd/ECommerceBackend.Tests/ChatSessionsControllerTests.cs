using System.Net;
using System.Net.Http.Json;
using ECommerceBackend.DTOs.Chats;
using ECommerceBackend.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
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
        Assert.Contains("1 sản phẩm với 1 phiên bản", message?.Messagecontent);
        Assert.Contains("Xiaomi 14T", message?.Messagecontent);
        Assert.Contains("14.000.000đ", message?.Messagecontent);
        Assert.DoesNotContain("14.500.000đ", message?.Messagecontent);
        Assert.Contains("còn 1 máy", message?.Messagecontent);
        Assert.Contains("/products/200", message?.Messagecontent);
        Assert.Equal(
            1,
            message?.Messagecontent.Split("/products/200").Length - 1);
        Assert.DoesNotContain("tối đa 3 sản phẩm", message?.Messagecontent);
        Assert.Contains("gợi ý chính xác hơn", message?.Messagecontent);
        Assert.Equal(1, message?.Recommendations?.Count);
        Assert.All(message!.Recommendations!, item => Assert.Equal(200, item.Productid));
        Assert.Equal(2001, message.Recommendations![0].Variantid);
        Assert.Equal("/uploads/products/xiaomi-14t.jpg", message.Recommendations[0].Imageurl);
        Assert.Equal(ChatResponseTypes.Recommendation, message.Responsetype);
        Assert.Equal("Xiaomi", message.Recommendations[0].Brand);
        Assert.Contains("5000 mAh", message.Recommendations[0].Specifications);

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
    public async Task GetResponseAsync_WithMultipleVariantsPerProduct_ReturnsOneCardPerProduct()
    {
        var products = new[]
        {
            new ProductConsultationResult(
                1, 11, "OnePlus 12", "OnePlus", "Dien thoai", "New Seal", "OP12-256",
                18_490_000, 20_990_000, 2, string.Empty,
                new Dictionary<string, string>
                {
                    ["Chipset"] = "Snapdragon 8 Gen 3",
                    ["Camera sau"] = "Hasselblad Color Calibration"
                }),
            new ProductConsultationResult(
                1, 12, "OnePlus 12", "OnePlus", "Dien thoai", "New Seal", "OP12-512",
                19_990_000, 22_990_000, 2, string.Empty,
                new Dictionary<string, string>
                {
                    ["Chipset"] = "Snapdragon 8 Gen 3",
                    ["Camera sau"] = "Hasselblad Color Calibration"
                }),
            new ProductConsultationResult(
                2, 21, "vivo V40 5G", "vivo", "Dien thoai", "New Seal", "V40-256",
                13_990_000, 15_990_000, 2, string.Empty,
                new Dictionary<string, string>
                {
                    ["Chipset"] = "Snapdragon 7 Gen 3",
                    ["Camera sau"] = "ZEISS Portrait"
                }),
            new ProductConsultationResult(
                2, 22, "vivo V40 5G", "vivo", "Dien thoai", "New Seal", "V40-512",
                15_490_000, 17_990_000, 2, string.Empty,
                new Dictionary<string, string>
                {
                    ["Chipset"] = "Snapdragon 7 Gen 3",
                    ["Camera sau"] = "ZEISS Portrait"
                }),
            new ProductConsultationResult(
                3, 31, "Xiaomi 14T Pro", "Xiaomi", "Dien thoai", "New Seal", "14TP-256",
                15_490_000, 16_990_000, 2, string.Empty,
                new Dictionary<string, string>
                {
                    ["Chipset"] = "Dimensity 9300+",
                    ["Camera sau"] = "Leica Summilux"
                })
        };
        var provider = new GroundedAiProvider(
            new StubProductConsultationService(products),
            new StubHttpClientFactory(),
            Options.Create(new AiAssistantOptions { Provider = "Catalog" }),
            NullLogger<GroundedAiProvider>.Instance);

        var response = await provider.GetResponseAsync(new AiConversationRequest(
            1,
            "Tim may chup anh dep tu 10 den 20 trieu",
            Array.Empty<AiConversationMessage>()));

        Assert.Equal(ChatResponseTypes.Recommendation, response.ResponseType);
        Assert.Equal(new[] { 1, 2, 3 }, response.Recommendations.Select(item => item.ProductId));
        Assert.Contains("3 s", response.Text);
        Assert.Contains("3 phi", response.Text);
        Assert.Equal(3, response.Text.Split("Lý do gợi ý").Length - 1);
    }

    [Fact]
    public async Task PostMessage_WithVagueRequest_AsksForMissingCriteriaInSteps()
    {
        var sessionId = await SeedSessionAsync();
        using var request = CreatePost(
            $"/api/chatsessions/{sessionId}/messages",
            "Customer",
            1,
            new CreateChatMessageRequestDto
            {
                Messagecontent = "Tư vấn cho tôi một chiếc điện thoại"
            },
            includeGuestToken: true);

        var response = await _client.SendAsync(request);
        var message = await response.Content.ReadFromJsonAsync<ChatMessageDto>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("assistant", message?.Sendertype);
        Assert.Contains("ngân sách", message?.Messagecontent, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(ChatResponseTypes.Clarification, message?.Responsetype);
        Assert.Contains("Dưới 10 triệu", message?.Quickreplies ?? []);
        Assert.Empty(message?.Recommendations ?? []);

        using var budgetRequest = CreatePost(
            $"/api/chatsessions/{sessionId}/messages",
            "Customer",
            1,
            new CreateChatMessageRequestDto { Messagecontent = "Từ 10 đến 20 triệu" },
            includeGuestToken: true);
        var budgetResponse = await _client.SendAsync(budgetRequest);
        var usageMessage = await budgetResponse.Content.ReadFromJsonAsync<ChatMessageDto>();

        Assert.Equal(HttpStatusCode.OK, budgetResponse.StatusCode);
        Assert.Contains("nhu cầu", usageMessage?.Messagecontent, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Chơi game", usageMessage?.Quickreplies ?? []);

        using var messagesRequest = new HttpRequestMessage(
            HttpMethod.Get,
            $"/api/chatsessions/{sessionId}/messages");
        messagesRequest.Headers.Add("X-Test-Role", "Customer");
        messagesRequest.Headers.Add("X-Test-UserId", "1");
        messagesRequest.Headers.Add("x-guest-session-token", GuestToken);
        var messagesResponse = await _client.SendAsync(messagesRequest);
        var history = await messagesResponse.Content.ReadFromJsonAsync<List<ChatMessageDto>>();

        Assert.Equal(HttpStatusCode.OK, messagesResponse.StatusCode);
        Assert.Equal(2, history?.Count(item =>
            item.Responsetype == ChatResponseTypes.Clarification));
        Assert.All(
            history!.Where(item => item.Responsetype == ChatResponseTypes.Clarification),
            item => Assert.NotEmpty(item.Quickreplies ?? []));
    }

    [Fact]
    public void BuildCatalogResponse_WhenComparingProducts_ReturnsStructuredComparison()
    {
        var products = new[]
        {
            new ProductConsultationResult(
                1, 11, "Camera Phone", "Brand A", "Điện thoại", "New Seal", "A-1",
                15_000_000, 16_000_000, 2, string.Empty,
                new Dictionary<string, string>
                {
                    ["Chipset"] = "Chip A",
                    ["Dung lượng RAM"] = "12GB",
                    ["Bộ nhớ trong"] = "256GB",
                    ["Camera sau"] = "50MP OIS",
                    ["Pin"] = "5000mAh"
                }),
            new ProductConsultationResult(
                2, 22, "Gaming Phone", "Brand B", "Điện thoại", "New Seal", "B-1",
                14_000_000, 14_000_000, 1, string.Empty,
                new Dictionary<string, string>
                {
                    ["Chipset"] = "Chip B",
                    ["Dung lượng RAM"] = "16GB",
                    ["Bộ nhớ trong"] = "512GB",
                    ["Camera sau"] = "48MP",
                    ["Pin"] = "5500mAh"
                })
        };

        var response = GroundedAiProvider.BuildCatalogResponse(
            "So sánh hai sản phẩm này",
            products);

        Assert.Contains("So sánh nhanh 2 sản phẩm", response);
        Assert.Contains("RAM / Bộ nhớ: 12GB / 256GB", response);
        Assert.Contains("Chụp ảnh: Camera Phone", response);
        Assert.Contains("Hiệu năng: Gaming Phone", response);
        Assert.Contains("Pin và sạc: Gaming Phone", response);
        Assert.Contains("Giá dễ tiếp cận nhất: Gaming Phone", response);
        Assert.Contains("Anh/chị ưu tiên camera, hiệu năng hay pin", response);
    }

    [Fact]
    public void BuildCatalogResponse_WithCameraNeed_ExplainsRecommendationReason()
    {
        var products = new[]
        {
            new ProductConsultationResult(
                1, 11, "Demo Leica Phone", "Xiaomi", "Điện thoại", "New Seal", "CAM-1",
                18_000_000, 20_000_000, 2, string.Empty,
                new Dictionary<string, string>
                {
                    ["Camera sau"] = "50MP Leica OIS",
                    ["Công nghệ camera"] = "Leica Summilux, OIS",
                    ["Quay video sau"] = "4K HDR",
                    ["Chipset"] = "Snapdragon 8 Gen 3"
                },
                "Điện thoại tập trung camera Leica.")
        };

        var response = GroundedAiProvider.BuildCatalogResponse(
            "Tư vấn máy chụp ảnh đẹp",
            products);

        Assert.Contains("Lý do gợi ý", response);
        Assert.Contains("Leica Summilux", response);
        Assert.Contains("4K HDR", response);
    }

    [Fact]
    public void BuildCatalogResponse_WhenProductHasSlug_UsesSeoFriendlyProductLink()
    {
        var products = new[]
        {
            new ProductConsultationResult(
                ProductId: 10,
                VariantId: 101,
                ProductName: "Google Pixel 10 Pro",
                Brand: "Google Pixel",
                Category: "Điện thoại",
                Condition: "New Seal",
                Sku: "PIXEL-10-PRO",
                Price: 23_990_000,
                BasePrice: 25_990_000,
                Stock: 2,
                ImageUrl: string.Empty,
                Specifications: new Dictionary<string, string>
                {
                    ["Camera sau"] = "50MP OIS",
                    ["Chipset"] = "Google Tensor G5"
                },
                ProductSlug: "google-pixel-10-pro")
        };

        var response = GroundedAiProvider.BuildCatalogResponse(
            "Tư vấn Pixel 10 Pro",
            products);

        Assert.Contains("[Google Pixel 10 Pro](/products/google-pixel-10-pro)", response);
        Assert.DoesNotContain("Xem chi tiết: /products/google-pixel-10-pro", response);
        Assert.DoesNotContain("/products/10", response);
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
        Assert.DoesNotContain("tối đa 3 sản phẩm", response);
        Assert.Contains("gợi ý chính xác hơn", response);
    }

    [Fact]
    public async Task GetResponseAsync_WhenComparing_ReturnsStructuredComparisonMetadata()
    {
        var products = new[]
        {
            new ProductConsultationResult(
                1, 11, "Camera Phone", "Brand A", "Điện thoại", "New Seal", "A-1",
                15_000_000, 16_000_000, 2, string.Empty,
                new Dictionary<string, string> { ["Camera sau"] = "50MP OIS" }),
            new ProductConsultationResult(
                2, 22, "Gaming Phone", "Brand B", "Điện thoại", "New Seal", "B-1",
                14_000_000, 14_000_000, 1, string.Empty,
                new Dictionary<string, string> { ["Chipset"] = "Chip B" })
        };
        var consultationService = new StubProductConsultationService(products);
        var provider = new GroundedAiProvider(
            consultationService,
            new StubHttpClientFactory(),
            Options.Create(new AiAssistantOptions
            {
                Provider = "OpenAICompatible",
                BaseUrl = "http://language-model-should-not-be-called",
                Model = "test-model"
            }),
            NullLogger<GroundedAiProvider>.Instance);

        var response = await provider.GetResponseAsync(new AiConversationRequest(
            1,
            "So sánh Camera Phone và Gaming Phone",
            new[]
            {
                new AiConversationMessage("user", "Tìm điện thoại từ 10 đến 20 triệu"),
                new AiConversationMessage(
                    "assistant",
                    "Tôi đã tìm thấy một sản phẩm trong khoảng giá.",
                    ChatResponseTypes.Recommendation)
            }));

        Assert.Equal(ChatResponseTypes.Comparison, response.ResponseType);
        Assert.Equal(2, response.Recommendations.Count);
        Assert.Contains("Ưu tiên camera", response.QuickReplies ?? []);
        Assert.Contains("So sánh nhanh 2 sản phẩm", response.Text);
        Assert.Equal(
            "So sánh Camera Phone và Gaming Phone",
            consultationService.LastQuery);
    }

    [Fact]
    public async Task GetResponseAsync_WithNaturalComparisonPhrase_UsesPreviousRecommendationScope()
    {
        var products = new[]
        {
            CreateConsultationResult(1, "Camera Phone"),
            CreateConsultationResult(2, "Gaming Phone"),
            CreateConsultationResult(3, "Unrelated Phone")
        };
        var consultationService = new StubProductConsultationService(products);
        var provider = new GroundedAiProvider(
            consultationService,
            new StubHttpClientFactory(),
            Options.Create(new AiAssistantOptions { Provider = "Catalog" }),
            NullLogger<GroundedAiProvider>.Instance);

        var response = await provider.GetResponseAsync(new AiConversationRequest(
            1,
            "Hai máy này khác nhau thế nào",
            new[]
            {
                new AiConversationMessage(
                    "assistant",
                    "Tôi vừa đề xuất hai sản phẩm.",
                    ChatResponseTypes.Recommendation,
                    new[] { 1, 2 })
            }));

        Assert.Equal(ChatResponseTypes.Comparison, response.ResponseType);
        Assert.Equal(new[] { 1, 2 }, consultationService.LastProductIds);
        Assert.DoesNotContain(
            response.Recommendations,
            product => product.ProductId == 3);
        Assert.Contains("Gợi ý theo từng tiêu chí", response.Text);
        Assert.Contains("Ưu tiên hiệu năng", response.QuickReplies ?? []);
    }

    [Fact]
    public async Task GetResponseAsync_WithExplicitTwoModelComparison_ReturnsOnlyThoseModels()
    {
        var products = new[]
        {
            CreateConsultationResult(1, "Google Pixel 8 Pro"),
            CreateConsultationResult(2, "iPhone 15 Pro Max"),
            CreateConsultationResult(3, "Samsung Galaxy S24 Ultra")
        };
        var provider = new GroundedAiProvider(
            new StubProductConsultationService(products),
            new StubHttpClientFactory(),
            Options.Create(new AiAssistantOptions { Provider = "Catalog" }),
            NullLogger<GroundedAiProvider>.Instance);

        var response = await provider.GetResponseAsync(new AiConversationRequest(
            1,
            "So sánh Google Pixel 8 Pro và iPhone 15 Pro Max",
            Array.Empty<AiConversationMessage>()));

        Assert.Equal(ChatResponseTypes.Comparison, response.ResponseType);
        Assert.Equal(
            new[] { "Google Pixel 8 Pro", "iPhone 15 Pro Max" },
            response.Recommendations.Select(item => item.ProductName));
        Assert.DoesNotContain(
            response.Recommendations,
            item => item.ProductName == "Samsung Galaxy S24 Ultra");
    }

    [Fact]
    public async Task GetResponseAsync_WithVagueFamilyComparison_AsksForSpecificModels()
    {
        var products = new[]
        {
            CreateConsultationResult(1, "POCO F6 Pro"),
            CreateConsultationResult(2, "POCO X7 Pro"),
            CreateConsultationResult(3, "Redmi Note 13 Pro"),
            CreateConsultationResult(4, "Redmi Note 14 Pro")
        };
        var provider = new GroundedAiProvider(
            new StubProductConsultationService(products),
            new StubHttpClientFactory(),
            Options.Create(new AiAssistantOptions { Provider = "Catalog" }),
            NullLogger<GroundedAiProvider>.Instance);

        var response = await provider.GetResponseAsync(new AiConversationRequest(
            1,
            "So sánh POCO với Redmi",
            Array.Empty<AiConversationMessage>()));

        Assert.Equal(ChatResponseTypes.Clarification, response.ResponseType);
        Assert.Empty(response.Recommendations);
        Assert.Contains("model cụ thể", response.Text);
        Assert.Contains("POCO F6 Pro", response.QuickReplies ?? []);
    }

    [Fact]
    public async Task GetResponseAsync_WithGenericComparisonPrompt_AsksForProductNamesWithoutSearching()
    {
        var consultationService = new StubProductConsultationService(new[]
        {
            CreateConsultationResult(1, "iQOO 13"),
            CreateConsultationResult(2, "OnePlus 12")
        });
        var provider = new GroundedAiProvider(
            consultationService,
            new StubHttpClientFactory(),
            Options.Create(new AiAssistantOptions { Provider = "Catalog" }),
            NullLogger<GroundedAiProvider>.Instance);

        var response = await provider.GetResponseAsync(new AiConversationRequest(
            1,
            "So sánh sản phẩm",
            Array.Empty<AiConversationMessage>()));

        Assert.Equal(ChatResponseTypes.Clarification, response.ResponseType);
        Assert.Empty(response.Recommendations);
        Assert.Contains("tên 2-3 sản phẩm", response.Text);
        Assert.Null(consultationService.LastQuery);
    }

    [Fact]
    public async Task GetResponseAsync_WithComparisonConnectorButOnlyOneMatchedProduct_AsksForSpecificModels()
    {
        var products = new[]
        {
            CreateConsultationResult(1, "Xiaomi 14T Pro")
        };
        var provider = new GroundedAiProvider(
            new StubProductConsultationService(products),
            new StubHttpClientFactory(),
            Options.Create(new AiAssistantOptions { Provider = "Catalog" }),
            NullLogger<GroundedAiProvider>.Instance);

        var response = await provider.GetResponseAsync(new AiConversationRequest(
            1,
            "so sanh xiaomi 14T voi redmagic",
            Array.Empty<AiConversationMessage>()));

        Assert.Equal(ChatResponseTypes.Clarification, response.ResponseType);
        Assert.Empty(response.Recommendations);
        Assert.Contains("model", ProductConsultationService.Normalize(response.Text));
        Assert.Contains("Xiaomi 14T Pro", response.QuickReplies ?? []);
    }

    [Fact]
    public async Task GetResponseAsync_WithCameraNeedWithoutBudget_AsksForBudget()
    {
        var consultationService = new StubProductConsultationService(
            new[] { CreateConsultationResult(1, "Camera Phone") });
        var provider = new GroundedAiProvider(
            consultationService,
            new StubHttpClientFactory(),
            Options.Create(new AiAssistantOptions { Provider = "Catalog" }),
            NullLogger<GroundedAiProvider>.Instance);

        var response = await provider.GetResponseAsync(new AiConversationRequest(
            1,
            "Gợi ý máy chụp ảnh đẹp",
            Array.Empty<AiConversationMessage>()));

        Assert.Equal(ChatResponseTypes.Clarification, response.ResponseType);
        Assert.Contains("ngân sách", response.Text, StringComparison.OrdinalIgnoreCase);
        Assert.Null(consultationService.LastQuery);
    }

    [Fact]
    public async Task GetResponseAsync_WithBudgetInstructionButNoAmount_AsksForBudget()
    {
        var consultationService = new StubProductConsultationService(
            new[] { CreateConsultationResult(1, "OnePlus 15") });
        var provider = new GroundedAiProvider(
            consultationService,
            new StubHttpClientFactory(),
            Options.Create(new AiAssistantOptions { Provider = "Catalog" }),
            NullLogger<GroundedAiProvider>.Instance);

        var response = await provider.GetResponseAsync(new AiConversationRequest(
            1,
            "Hay tu van dien thoai theo ngan sach cua toi. Neu toi chua noi ngan sach, hay hoi lai truoc khi goi y.",
            Array.Empty<AiConversationMessage>()));

        Assert.Equal(ChatResponseTypes.Clarification, response.ResponseType);
        Assert.Contains("ngan sach", ProductConsultationService.Normalize(response.Text));
        Assert.Empty(response.Recommendations);
        Assert.Null(consultationService.LastQuery);
    }

    [Fact]
    public async Task GetResponseAsync_AfterComparison_RanksBySelectedPriority()
    {
        var products = new[]
        {
            new ProductConsultationResult(
                1, 11, "Camera Phone", "Brand A", "Điện thoại", "New Seal", "A-1",
                15_000_000, 16_000_000, 2, string.Empty,
                new Dictionary<string, string>
                {
                    ["Chipset"] = "Snapdragon 7 Gen 3",
                    ["Dung lượng RAM"] = "8GB",
                    ["Camera sau"] = "200MP OIS"
                },
                "Điện thoại tập trung camera."),
            new ProductConsultationResult(
                2, 22, "Gaming Phone", "Brand B", "Điện thoại", "New Seal", "B-1",
                16_000_000, 16_000_000, 2, string.Empty,
                new Dictionary<string, string>
                {
                    ["Chipset"] = "Snapdragon 8 Gen 3",
                    ["Dung lượng RAM"] = "16GB",
                    ["Kích thước màn hình"] = "AMOLED 144Hz"
                },
                "Điện thoại gaming có tản nhiệt tốt."),
            new ProductConsultationResult(
                3, 33, "Battery Phone", "Brand C", "Điện thoại", "New Seal", "C-1",
                14_000_000, 14_000_000, 2, string.Empty,
                new Dictionary<string, string>
                {
                    ["Chipset"] = "Snapdragon 7 Gen 3",
                    ["Pin"] = "6100mAh",
                    ["Công nghệ sạc"] = "Sạc nhanh 120W"
                })
        };
        var consultationService = new StubProductConsultationService(products);
        var provider = new GroundedAiProvider(
            consultationService,
            new StubHttpClientFactory(),
            Options.Create(new AiAssistantOptions { Provider = "Catalog" }),
            NullLogger<GroundedAiProvider>.Instance);

        var response = await provider.GetResponseAsync(new AiConversationRequest(
            1,
            "Ưu tiên hiệu năng",
            new[]
            {
                new AiConversationMessage(
                    "assistant",
                    "So sánh ba sản phẩm.",
                    ChatResponseTypes.Comparison,
                    new[] { 1, 2, 3 })
            }));

        Assert.Equal(ChatResponseTypes.Recommendation, response.ResponseType);
        Assert.Equal("Gaming Phone", response.Recommendations[0].ProductName);
        Assert.Contains("Gaming Phone phù hợp nhất", response.Text);
        Assert.Equal(new[] { 1, 2, 3 }, consultationService.LastProductIds);
    }

    [Fact]
    public async Task GetResponseAsync_WithNewCompleteRequest_DoesNotMixPreviousIntent()
    {
        var consultationService = new StubProductConsultationService(
            new[] { CreateConsultationResult(1, "Camera Phone") });
        var provider = new GroundedAiProvider(
            consultationService,
            new StubHttpClientFactory(),
            Options.Create(new AiAssistantOptions { Provider = "Catalog" }),
            NullLogger<GroundedAiProvider>.Instance);
        const string currentRequest =
            "Tim dien thoai chup anh dep tu 15 den 30 trieu";

        await provider.GetResponseAsync(new AiConversationRequest(
            1,
            currentRequest,
            new[]
            {
                new AiConversationMessage(
                    "user",
                    "Tim dien thoai choi game duoi 15 trieu"),
                new AiConversationMessage(
                    "assistant",
                    "Day la cac may gaming phu hop.",
                    ChatResponseTypes.Recommendation)
            }));

        Assert.Equal(currentRequest, consultationService.LastQuery);
    }

    [Fact]
    public async Task GetResponseAsync_WithThreeProductsReference_UsesPreviousRecommendationScope()
    {
        var products = new[]
        {
            CreateConsultationResult(1, "iQOO Neo 10"),
            CreateConsultationResult(2, "vivo V40 5G"),
            CreateConsultationResult(3, "Honor 400 Pro"),
            CreateConsultationResult(4, "Unrelated Camera Phone")
        };
        var consultationService = new StubProductConsultationService(products);
        var provider = new GroundedAiProvider(
            consultationService,
            new StubHttpClientFactory(),
            Options.Create(new AiAssistantOptions { Provider = "Catalog" }),
            NullLogger<GroundedAiProvider>.Instance);

        var response = await provider.GetResponseAsync(new AiConversationRequest(
            1,
            "Trong 3 may do co may nao chup anh dep khong",
            new[]
            {
                new AiConversationMessage(
                    "assistant",
                    "Toi tim thay 3 san pham phu hop.",
                    ChatResponseTypes.Recommendation,
                    new[] { 1, 2, 3 })
            }));

        Assert.Equal(new[] { 1, 2, 3 }, consultationService.LastProductIds);
        Assert.DoesNotContain(
            response.Recommendations,
            product => product.ProductId == 4);
        Assert.Equal(ChatResponseTypes.Recommendation, response.ResponseType);
        Assert.Contains("iQOO Neo 10", response.Text);
    }

    [Fact]
    public async Task GetResponseAsync_WithShortCameraFollowUp_UsesPreviousRecommendationScope()
    {
        var products = new[]
        {
            CreateConsultationResult(1, "iQOO Neo 10"),
            CreateConsultationResult(2, "vivo V40 5G"),
            CreateConsultationResult(3, "Honor 400 Pro")
        };
        var consultationService = new StubProductConsultationService(products);
        var provider = new GroundedAiProvider(
            consultationService,
            new StubHttpClientFactory(),
            Options.Create(new AiAssistantOptions { Provider = "Catalog" }),
            NullLogger<GroundedAiProvider>.Instance);

        await provider.GetResponseAsync(new AiConversationRequest(
            1,
            "May chup anh dep",
            new[]
            {
                new AiConversationMessage(
                    "assistant",
                    "Toi tim thay 3 san pham phu hop.",
                    ChatResponseTypes.Recommendation,
                    new[] { 1, 2, 3 })
            }));

        Assert.Equal(new[] { 1, 2, 3 }, consultationService.LastProductIds);
    }

    [Fact]
    public async Task ProductSearch_WithExplicitModelNames_PrioritizesExactModels()
    {
        using var scope = _application.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
        await db.Database.EnsureDeletedAsync();
        await db.Database.EnsureCreatedAsync();

        var category = new Category { Categoryid = 1, Categoryname = "Điện thoại" };
        var brands = new[]
        {
            new Brand { Brandid = 1, Brandname = "Google Pixel" },
            new Brand { Brandid = 2, Brandname = "iPhone" },
            new Brand { Brandid = 3, Brandname = "Samsung" }
        };
        var products = new[]
        {
            new Product { Productid = 1, Categoryid = 1, Brandid = 1, Productname = "Google Pixel 10 Pro" },
            new Product { Productid = 2, Categoryid = 1, Brandid = 1, Productname = "Google Pixel 8 Pro" },
            new Product { Productid = 3, Categoryid = 1, Brandid = 2, Productname = "iPhone 15 Pro Max" },
            new Product { Productid = 4, Categoryid = 1, Brandid = 3, Productname = "Samsung Galaxy S24 Ultra" }
        };
        var variants = products.Select(product => new Productvariant
        {
            Variantid = product.Productid * 10,
            Productid = product.Productid,
            Condition = "New Seal",
            Baseprice = 20_000_000 + product.Productid,
            Specifications = "{}"
        }).ToList();

        db.Categories.Add(category);
        db.Brands.AddRange(brands);
        db.Products.AddRange(products);
        db.Productvariants.AddRange(variants);
        db.Inventoryitems.AddRange(variants.Select(variant => new Inventoryitem
        {
            Imei = $"COMPARE-{variant.Variantid}",
            Variantid = variant.Variantid,
            Status = "InStock"
        }));
        await db.SaveChangesAsync();

        var service = new ProductConsultationService(
            db,
            Options.Create(new AiAssistantOptions { MaxRetrievedVariants = 5 }));
        var results = await service.SearchAsync(
            "So sánh Google Pixel 8 Pro, iPhone 15 Pro Max và Samsung Galaxy S24 Ultra");
        var firstThreeProducts = results
            .Select(item => item.ProductId)
            .Distinct()
            .Take(3)
            .ToList();

        Assert.DoesNotContain(1, firstThreeProducts);
        Assert.Contains(2, firstThreeProducts);
        Assert.Contains(3, firstThreeProducts);
        Assert.Contains(4, firstThreeProducts);
    }

    [Fact]
    public async Task ProductSearch_WithGamingBudget_PrioritizesGamingSpecifications()
    {
        using var scope = _application.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
        await db.Database.EnsureDeletedAsync();
        await db.Database.EnsureCreatedAsync();

        db.Categories.Add(new Category { Categoryid = 1, Categoryname = "Dien thoai" });
        db.Brands.Add(new Brand { Brandid = 1, Brandname = "Demo" });
        db.Products.AddRange(
            new Product
            {
                Productid = 1,
                Categoryid = 1,
                Brandid = 1,
                Productname = "Demo Gaming Phone",
                Description = "Dien thoai choi game co tan nhiet tot."
            },
            new Product
            {
                Productid = 2,
                Categoryid = 1,
                Brandid = 1,
                Productname = "Demo Camera Phone",
                Description = "Dien thoai chup anh va quay video."
            });
        db.Productvariants.AddRange(
            new Productvariant
            {
                Variantid = 11,
                Productid = 1,
                Condition = "New Seal",
                Baseprice = 14_000_000,
                Specifications = JsonSerializer.Serialize(new Dictionary<string, string>
                {
                    ["Chipset"] = "Snapdragon 8 Gen 3",
                    ["GPU"] = "Adreno",
                    ["Dung luong RAM"] = "16GB",
                    ["Man hinh"] = "144Hz",
                    ["Pin"] = "6000mAh"
                })
            },
            new Productvariant
            {
                Variantid = 22,
                Productid = 2,
                Condition = "New Seal",
                Baseprice = 13_000_000,
                Specifications = JsonSerializer.Serialize(new Dictionary<string, string>
                {
                    ["Chipset"] = "Snapdragon 7 Gen 3",
                    ["Dung luong RAM"] = "8GB",
                    ["Camera sau"] = "200MP OIS",
                    ["Pin"] = "5000mAh"
                })
            });
        db.Inventoryitems.AddRange(
            new Inventoryitem { Imei = "GAME-01", Variantid = 11, Status = "InStock" },
            new Inventoryitem { Imei = "CAMERA-01", Variantid = 22, Status = "InStock" });
        await db.SaveChangesAsync();

        var service = new ProductConsultationService(
            db,
            Options.Create(new AiAssistantOptions { MaxRetrievedVariants = 5 }));
        var results = await service.SearchAsync(
            "Tim dien thoai choi game duoi 15 trieu");

        Assert.NotEmpty(results);
        Assert.Equal("Demo Gaming Phone", results[0].ProductName);
        Assert.All(results, item => Assert.True(item.Price <= 15_000_000));

        var scopedResults = await service.SearchAsync(
            "Ưu tiên hiệu năng",
            new[] { 1, 2 });

        Assert.NotEmpty(scopedResults);
        Assert.Equal("Demo Gaming Phone", scopedResults[0].ProductName);
    }

    [Fact]
    public async Task ProductSearch_WithCameraNeed_PrioritizesCameraTechnologyOverMegapixelsOnly()
    {
        using var scope = _application.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
        await db.Database.EnsureDeletedAsync();
        await db.Database.EnsureCreatedAsync();

        db.Categories.Add(new Category { Categoryid = 1, Categoryname = "Dien thoai" });
        db.Brands.Add(new Brand { Brandid = 1, Brandname = "Demo" });
        db.Products.AddRange(
            new Product
            {
                Productid = 1,
                Categoryid = 1,
                Brandid = 1,
                Productname = "Demo Leica Camera",
                Description = "Dien thoai chup anh voi cong nghe Leica."
            },
            new Product
            {
                Productid = 2,
                Categoryid = 1,
                Brandid = 1,
                Productname = "Demo Megapixel Phone",
                Description = "Dien thoai camera do phan giai cao."
            });
        db.Productvariants.AddRange(
            new Productvariant
            {
                Variantid = 11,
                Productid = 1,
                Condition = "New Seal",
                Baseprice = 25_000_000,
                Specifications = JsonSerializer.Serialize(new Dictionary<string, string>
                {
                    ["Camera sau"] = "50MP Leica OIS",
                    ["Quay video sau"] = "4K HDR"
                })
            },
            new Productvariant
            {
                Variantid = 22,
                Productid = 2,
                Condition = "New Seal",
                Baseprice = 20_000_000,
                Specifications = JsonSerializer.Serialize(new Dictionary<string, string>
                {
                    ["Camera sau"] = "200MP",
                    ["Quay video sau"] = "4K"
                })
            });
        db.Inventoryitems.AddRange(
            new Inventoryitem { Imei = "LEICA-01", Variantid = 11, Status = "InStock" },
            new Inventoryitem { Imei = "MP-01", Variantid = 22, Status = "InStock" });
        await db.SaveChangesAsync();

        var service = new ProductConsultationService(
            db,
            Options.Create(new AiAssistantOptions { MaxRetrievedVariants = 5 }));
        var results = await service.SearchAsync(
            "Tim dien thoai chup anh dep duoi 30 trieu");

        Assert.NotEmpty(results);
        Assert.Equal("Demo Leica Camera", results[0].ProductName);
    }

    [Fact]
    public async Task ProductSearch_WithGamingNeed_PrioritizesChipsetOverRamOnly()
    {
        using var scope = _application.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
        await db.Database.EnsureDeletedAsync();
        await db.Database.EnsureCreatedAsync();

        db.Categories.Add(new Category { Categoryid = 1, Categoryname = "Dien thoai" });
        db.Brands.Add(new Brand { Brandid = 1, Brandname = "Demo" });
        db.Products.AddRange(
            new Product
            {
                Productid = 1,
                Categoryid = 1,
                Brandid = 1,
                Productname = "Demo Flagship Chip",
                Description = "Dien thoai choi game hieu nang cao."
            },
            new Product
            {
                Productid = 2,
                Categoryid = 1,
                Brandid = 1,
                Productname = "Demo Ram Monster",
                Description = "Dien thoai RAM lon."
            });
        db.Productvariants.AddRange(
            new Productvariant
            {
                Variantid = 11,
                Productid = 1,
                Condition = "New Seal",
                Baseprice = 24_000_000,
                Specifications = JsonSerializer.Serialize(new Dictionary<string, string>
                {
                    ["Chipset"] = "Snapdragon 8 Gen 3",
                    ["Dung luong RAM"] = "8GB",
                    ["GPU"] = "Adreno",
                    ["Man hinh"] = "144Hz"
                })
            },
            new Productvariant
            {
                Variantid = 22,
                Productid = 2,
                Condition = "New Seal",
                Baseprice = 22_000_000,
                Specifications = JsonSerializer.Serialize(new Dictionary<string, string>
                {
                    ["Chipset"] = "Snapdragon 7 Gen 3",
                    ["Dung luong RAM"] = "24GB",
                    ["Man hinh"] = "120Hz"
                })
            });
        db.Inventoryitems.AddRange(
            new Inventoryitem { Imei = "CHIP-01", Variantid = 11, Status = "InStock" },
            new Inventoryitem { Imei = "RAM-01", Variantid = 22, Status = "InStock" });
        await db.SaveChangesAsync();

        var service = new ProductConsultationService(
            db,
            Options.Create(new AiAssistantOptions { MaxRetrievedVariants = 5 }));
        var results = await service.SearchAsync(
            "Tim dien thoai choi game duoi 30 trieu");

        Assert.NotEmpty(results);
        Assert.Equal("Demo Flagship Chip", results[0].ProductName);
    }

    [Fact]
    public async Task GetResponseAsync_AfterComparison_KeepsComparedProductScope()
    {
        var products = new[]
        {
            CreateConsultationResult(1, "Google Pixel 10 Pro"),
            CreateConsultationResult(2, "Google Pixel 8 Pro"),
            CreateConsultationResult(3, "iPhone 15 Pro Max"),
            CreateConsultationResult(4, "Samsung Galaxy S24 Ultra")
        };
        var provider = new GroundedAiProvider(
            new StubProductConsultationService(products),
            new StubHttpClientFactory(),
            Options.Create(new AiAssistantOptions { Provider = "Catalog" }),
            NullLogger<GroundedAiProvider>.Instance);

        var response = await provider.GetResponseAsync(new AiConversationRequest(
            1,
            "Ưu tiên camera",
            new[]
            {
                new AiConversationMessage(
                    "assistant",
                    "So sánh Google Pixel 8 Pro, iPhone 15 Pro Max và Samsung Galaxy S24 Ultra",
                    ChatResponseTypes.Comparison,
                    new[] { 2, 3, 4 })
            }));

        Assert.DoesNotContain(
            response.Recommendations,
            item => item.ProductName == "Google Pixel 10 Pro");
        Assert.Equal(
            new[] { 2, 3, 4 },
            response.Recommendations.Select(item => item.ProductId));
    }

    private static ProductConsultationResult CreateConsultationResult(
        int productId,
        string productName) =>
        new(
            productId,
            productId * 10,
            productName,
            "Test brand",
            "Điện thoại",
            "New Seal",
            $"TEST-{productId}",
            20_000_000 + productId,
            20_000_000 + productId,
            1,
            string.Empty,
            new Dictionary<string, string> { ["Camera sau"] = "50MP" });

    private sealed class StubProductConsultationService(
        IReadOnlyList<ProductConsultationResult> products)
        : IProductConsultationService
    {
        public string? LastQuery { get; private set; }
        public IReadOnlyCollection<int>? LastProductIds { get; private set; }

        public Task<IReadOnlyList<ProductConsultationResult>> SearchAsync(
            string userMessage,
            IReadOnlyCollection<int>? productIds = null,
            CancellationToken cancellationToken = default)
        {
            LastQuery = userMessage;
            LastProductIds = productIds;
            var filteredProducts = productIds is { Count: > 0 }
                ? products.Where(product => productIds.Contains(product.ProductId)).ToList()
                : products;
            return Task.FromResult<IReadOnlyList<ProductConsultationResult>>(
                filteredProducts);
        }
    }

    private sealed class StubHttpClientFactory : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) =>
            throw new InvalidOperationException(
                "Language model must not be called for explicit comparisons.");
    }

    public void Dispose()
    {
        _client.Dispose();
        _application.Dispose();
    }
}
