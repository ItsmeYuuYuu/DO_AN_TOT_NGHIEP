using System.Net;
using System.Net.Http.Json;
using ECommerceBackend.DTOs.Returns;
using ECommerceBackend.IntegrationTests.Infrastructure;
using ECommerceBackend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ECommerceBackend.IntegrationTests;

public sealed class ReturnDepreciationWorkflowTests : IClassFixture<IntegrationTestFactory>
{
    private readonly IntegrationTestFactory _factory;

    public ReturnDepreciationWorkflowTests(IntegrationTestFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Change_Of_Mind_Is_Assessed_Then_Reclassified_Only_After_Customer_Accepts()
    {
        var seeded = await SeedCompletedDeliveryAsync(daysSinceDelivery: 5);
        using var customer = await _factory.CreateAuthenticatedClientAsync("it_customer_a");
        using var admin = await _factory.CreateAuthenticatedClientAsync("it_admin");

        var createResponse = await customer.PostAsJsonAsync("/api/ReturnRequests", new
        {
            orderid = seeded.OrderId,
            requesttype = "Return",
            reasoncategory = "ChangeOfMind",
            reason = "Không còn nhu cầu sử dụng",
            description = "Máy còn đẹp và đầy đủ dữ liệu kiểm thử.",
            orderitemids = new[] { seeded.OrderItemId },
            imageurls = Array.Empty<string>(),
            refunddestination = new
            {
                method = "BANK",
                bankname = "Integration Bank",
                accountnumber = "1234567890",
                accountholder = "INTEGRATION CUSTOMER A",
                confirmed = true
            }
        });
        var created = await createResponse.Content.ReadFromJsonAsync<ReturnRequestDto>();

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        Assert.NotNull(created);
        Assert.Equal(810_000m, created.Requestedrefundamount);

        var reviewResponse = await admin.PatchAsJsonAsync(
            $"/api/ReturnRequests/{created.Returnrequestid}/review",
            new { approved = true, note = "Đủ điều kiện kiểm tra." });
        Assert.Equal(HttpStatusCode.OK, reviewResponse.StatusCode);

        var receiveResponse = await admin.PatchAsJsonAsync(
            $"/api/ReturnRequests/{created.Returnrequestid}/receive",
            new
            {
                items = new[]
                {
                    new
                    {
                        returnitemid = created.Items.Single().Returnitemid,
                        condition = "Xước nhẹ ở viền, thiếu hộp và một phụ kiện.",
                        disposition = "Restock",
                        inspectiongrade = "Grade98",
                        faultresponsibility = "NoFault",
                        missingbox = true,
                        missingaccessorycount = 1
                    }
                },
                resolution = "Đủ điều kiện nhập lại kho máy 98%.",
                note = "Kiểm định integration test."
            });
        var assessed = await receiveResponse.Content.ReadFromJsonAsync<ReturnRequestDto>();

        Assert.Equal(HttpStatusCode.OK, receiveResponse.StatusCode);
        Assert.NotNull(assessed);
        Assert.Equal("AwaitingCustomerConfirmation", assessed.Status);
        Assert.Equal(702_000m, assessed.Approvedrefundamount);
        Assert.Equal(198_000m, assessed.Refundcalculation?.Totaldeductionamount);
        await AssertInventoryAsync(seeded.Imei, "Sold", "New", resaleVariantExpected: false);

        var disputeResponse = await customer.PostAsJsonAsync(
            $"/api/ReturnRequests/{created.Returnrequestid}/confirm-assessment",
            new ConfirmRefundAssessmentDto(false, "Đề nghị xem xét lại mức khấu hao."));
        var disputed = await disputeResponse.Content.ReadFromJsonAsync<ReturnRequestDto>();
        Assert.Equal(HttpStatusCode.OK, disputeResponse.StatusCode);
        Assert.Equal("AssessmentDisputed", disputed?.Status);
        await AssertInventoryAsync(seeded.Imei, "Sold", "New", resaleVariantExpected: false);

        var overrideResponse = await admin.PostAsJsonAsync(
            $"/api/ReturnRequests/{created.Returnrequestid}/override-assessment",
            new OverrideRefundAssessmentDto(720_000m, "Manager hỗ trợ ngoại lệ sau đối soát."));
        var overridden = await overrideResponse.Content.ReadFromJsonAsync<ReturnRequestDto>();
        Assert.Equal(HttpStatusCode.OK, overrideResponse.StatusCode);
        Assert.Equal("AwaitingCustomerConfirmation", overridden?.Status);
        Assert.Equal(720_000m, overridden?.Approvedrefundamount);
        Assert.True(overridden?.Refundcalculation?.Manageroverride);

        var confirmResponse = await customer.PostAsJsonAsync(
            $"/api/ReturnRequests/{created.Returnrequestid}/confirm-assessment",
            new ConfirmRefundAssessmentDto(true, "Tôi đồng ý mức hoàn."));
        var confirmed = await confirmResponse.Content.ReadFromJsonAsync<ReturnRequestDto>();

        Assert.Equal(HttpStatusCode.OK, confirmResponse.StatusCode);
        Assert.NotNull(confirmed);
        Assert.Equal("RefundPending", confirmed.Status);
        Assert.Equal(720_000m, confirmed.Approvedrefundamount);
        await AssertInventoryAsync(seeded.Imei, "InStock", "Like New (98%)", resaleVariantExpected: true);
    }

    [Fact]
    public async Task Request_After_Thirty_Days_From_Delivery_Is_Rejected()
    {
        var seeded = await SeedCompletedDeliveryAsync(daysSinceDelivery: 31);
        using var customer = await _factory.CreateAuthenticatedClientAsync("it_customer_a");

        var response = await customer.PostAsJsonAsync("/api/ReturnRequests", new
        {
            orderid = seeded.OrderId,
            requesttype = "Return",
            reasoncategory = "ChangeOfMind",
            reason = "Đã quá hạn",
            orderitemids = new[] { seeded.OrderItemId },
            imageurls = Array.Empty<string>(),
            refunddestination = new { method = "CASH", confirmed = true }
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private async Task<(int OrderId, int OrderItemId, string Imei)> SeedCompletedDeliveryAsync(int daysSinceDelivery)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
        var user = await db.Users.SingleAsync(item => item.Username == "it_customer_a");
        var customer = await db.Customers.SingleAsync(item => item.Email == "it.a@example.test");
        var variant = await db.Productvariants.SingleAsync(item => item.Sku == "IT-PHONE-128");
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var imei = $"IT-RETURN-{suffix}";
        var inventory = new Inventoryitem
        {
            Imei = imei,
            Variant = variant,
            Status = "Sold",
            Importedat = DateTime.UtcNow.AddMonths(-1),
            Warrantystatus = "Active",
            Warrantystartdate = DateTime.UtcNow.AddDays(-daysSinceDelivery),
            Warrantyenddate = DateTime.UtcNow.AddYears(1)
        };
        var order = new Order
        {
            User = user,
            Customer = customer,
            Orderdate = DateTime.UtcNow.AddDays(-60),
            Warehousecompletedat = DateTime.UtcNow.AddDays(-daysSinceDelivery),
            Totalamount = 1_000_000m,
            Discountamount = 100_000m,
            Finalamount = 900_000m,
            Paymentmethod = "BANK",
            Paymentstatus = "Paid",
            Paidamount = 900_000m,
            Requiredpayment = 900_000m,
            Checkouttype = "Member",
            Orderstatus = "Completed",
            Shippingname = customer.Fullname,
            Shippingphone = customer.Phone,
            Shippingemail = customer.Email,
            Shippingaddress = customer.Address,
            Shipment = new Shipment
            {
                Carrier = "STORE",
                Trackingcode = $"IT-{suffix}",
                Shippingfee = 0m,
                Status = "Delivered",
                Deliveredat = DateTime.UtcNow.AddDays(-daysSinceDelivery),
                Createdat = DateTime.UtcNow.AddDays(-daysSinceDelivery - 1)
            }
        };
        var orderItem = new Orderitem
        {
            Order = order,
            ImeiNavigation = inventory,
            Sellingprice = 1_000_000m
        };
        order.Orderitems.Add(orderItem);
        db.Orders.Add(order);
        await db.SaveChangesAsync();
        return (order.Orderid, orderItem.Orderitemid, imei);
    }

    private async Task AssertInventoryAsync(
        string imei,
        string expectedStatus,
        string expectedCondition,
        bool resaleVariantExpected)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
        var inventory = await db.Inventoryitems
            .AsNoTracking()
            .Include(item => item.Variant)
            .SingleAsync(item => item.Imei == imei);
        Assert.Equal(expectedStatus, inventory.Status);
        Assert.Equal(expectedCondition, inventory.Variant?.Condition);

        var returnItem = await db.Returnitems
            .AsNoTracking()
            .SingleAsync(item => item.Imei == imei);
        Assert.Equal(resaleVariantExpected, returnItem.Resalevariantid.HasValue);
    }
}
