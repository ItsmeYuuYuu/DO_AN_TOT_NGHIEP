using System.Net;
using System.Net.Http.Json;
using ECommerceBackend.DTOs.Chats;
using ECommerceBackend.IntegrationTests.Infrastructure;
using ECommerceBackend.Models;
using Microsoft.Extensions.DependencyInjection;

namespace ECommerceBackend.IntegrationTests;

public sealed class ChatConsultationHistoryTests : IClassFixture<IntegrationTestFactory>
{
    private readonly IntegrationTestFactory _factory;

    public ChatConsultationHistoryTests(IntegrationTestFactory factory) => _factory = factory;

    [Fact]
    public async Task Admin_Can_Review_Consultation_History_And_Customer_Cannot()
    {
        int sessionId;
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
            var customer = db.Customers.First(item => item.Email == "it.a@example.test");
            var admin = db.Users.First(item => item.Username == "it_admin");
            var session = new Chatsession
            {
                Customerid = customer.Customerid,
                Starttime = DateTime.UtcNow.AddMinutes(-10),
                Endtime = DateTime.UtcNow,
                Status = "Integration consultation",
                Assigneduserid = admin.Userid,
                Handoffstatus = "Closed",
                Handoffrequestedat = DateTime.UtcNow.AddMinutes(-9)
            };
            db.Chatsessions.Add(session);
            await db.SaveChangesAsync();
            db.Chatmessages.AddRange(
                new Chatmessage
                {
                    Sessionid = session.Sessionid,
                    Sendertype = "user",
                    Messagecontent = "Can tu van dien thoai",
                    Sentat = DateTime.UtcNow.AddMinutes(-8)
                },
                new Chatmessage
                {
                    Sessionid = session.Sessionid,
                    Sendertype = "consultant",
                    Messagecontent = "Noi dung tu van can duoc giam sat",
                    Sentat = DateTime.UtcNow.AddMinutes(-7)
                });
            await db.SaveChangesAsync();
            sessionId = session.Sessionid;
        }

        using var adminClient = await _factory.CreateAuthenticatedClientAsync("it_admin");
        using var customerClient = await _factory.CreateAuthenticatedClientAsync("it_customer_a");

        var historyResponse = await adminClient.GetAsync("/api/ChatSessions/consultation-history");
        var history = await historyResponse.Content.ReadFromJsonAsync<List<ChatSessionDto>>();
        var messagesResponse = await adminClient.GetAsync($"/api/ChatSessions/{sessionId}/messages");
        var messages = await messagesResponse.Content.ReadFromJsonAsync<List<ChatMessageDto>>();
        var forbiddenResponse = await customerClient.GetAsync("/api/ChatSessions/consultation-history");
        var deleteResponse = await customerClient.DeleteAsync($"/api/ChatSessions/{sessionId}");

        Assert.Equal(HttpStatusCode.OK, historyResponse.StatusCode);
        Assert.Contains(history!, item => item.Sessionid == sessionId && item.Handoffstatus == "Closed");
        Assert.Equal(HttpStatusCode.OK, messagesResponse.StatusCode);
        Assert.Contains(messages!, item =>
            item.Sendertype == "consultant" &&
            item.Messagecontent == "Noi dung tu van can duoc giam sat");
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, deleteResponse.StatusCode);
    }
}
