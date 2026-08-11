using System.Net;
using System.Net.Http.Json;
using ECommerceBackend.DTOs.Chats;
using ECommerceBackend.IntegrationTests.Infrastructure;
using ECommerceBackend.Models;
using ECommerceBackend.Services.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ECommerceBackend.IntegrationTests;

public sealed class SensitiveDataProtectionServiceTests
{
    private readonly SensitiveDataProtectionService _service = new();

    [Fact]
    public void Sanitizes_Sensitive_Identifiers_But_Preserves_Phone_And_Order_Code()
    {
        const string input =
            "CCCD 079203012345; STK 1234567890; số thẻ 4111 1111 1111 1111; CVV 123; " +
            "số điện thoại 0900000001; mã đơn #24.";

        var result = _service.Sanitize(input);

        Assert.Equal(4, result.Matches.Count);
        Assert.Contains("CCCD ************", result.SanitizedText);
        Assert.Contains("STK **********", result.SanitizedText);
        Assert.Contains("số thẻ ****************", result.SanitizedText);
        Assert.Contains("CVV ***", result.SanitizedText);
        Assert.Contains("0900000001", result.SanitizedText);
        Assert.Contains("#24", result.SanitizedText);
        Assert.DoesNotContain("079203012345", result.SanitizedText);
        Assert.DoesNotContain("1234567890", result.SanitizedText);
        Assert.DoesNotContain("4111 1111 1111 1111", result.SanitizedText);
    }

    [Theory]
    [InlineData("Gọi tôi qua số 0900000001")]
    [InlineData("Mã đơn hàng của tôi là 123456789012")]
    [InlineData("Cho tôi tra cứu đơn #24")]
    public void Leaves_Allowed_Contact_And_Order_Data_Unchanged(string input)
    {
        var result = _service.Sanitize(input);

        Assert.Empty(result.Matches);
        Assert.Equal(input, result.SanitizedText);
    }
}

public sealed class SensitiveChatEndpointTests : IClassFixture<IntegrationTestFactory>
{
    private readonly IntegrationTestFactory _factory;

    public SensitiveChatEndpointTests(IntegrationTestFactory factory) => _factory = factory;

    [Fact]
    public async Task Direct_Api_Request_Is_Redacted_Before_Database_Storage()
    {
        int sessionId;
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
            var customer = await db.Customers.FirstAsync(item => item.Email == "it.a@example.test");
            var session = new Chatsession
            {
                Customerid = customer.Customerid,
                Starttime = DateTime.UtcNow,
                Status = "Sensitive data protection",
                Handoffstatus = "Waiting",
                Handoffrequestedat = DateTime.UtcNow
            };
            db.Chatsessions.Add(session);
            await db.SaveChangesAsync();
            sessionId = session.Sessionid;
        }

        const string rawContent =
            "CCCD 079203012345, số tài khoản 1234567890, số điện thoại 0900000001, mã đơn #24";
        using var customerClient = await _factory.CreateAuthenticatedClientAsync("it_customer_a");

        var response = await customerClient.PostAsJsonAsync(
            $"/api/ChatSessions/{sessionId}/messages",
            new { messagecontent = rawContent });
        var responseMessage = await response.Content.ReadFromJsonAsync<ChatMessageDto>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(responseMessage);
        Assert.DoesNotContain("079203012345", responseMessage.Messagecontent);
        Assert.DoesNotContain("1234567890", responseMessage.Messagecontent);
        Assert.Contains("0900000001", responseMessage.Messagecontent);
        Assert.Contains("#24", responseMessage.Messagecontent);

        await using var verificationScope = _factory.Services.CreateAsyncScope();
        var verificationDb = verificationScope.ServiceProvider.GetRequiredService<ECommerceContext>();
        var storedMessage = await verificationDb.Chatmessages
            .AsNoTracking()
            .SingleAsync(item => item.Sessionid == sessionId && item.Sendertype == "user");

        Assert.DoesNotContain("079203012345", storedMessage.Messagecontent);
        Assert.DoesNotContain("1234567890", storedMessage.Messagecontent);
        Assert.Contains("CCCD ************", storedMessage.Messagecontent);
        Assert.Contains("số tài khoản **********", storedMessage.Messagecontent);
    }
}
