using System.Net;
using System.Net.Http.Json;
using ECommerceBackend.DTOs.Reviews;
using ECommerceBackend.IntegrationTests.Infrastructure;
using ECommerceBackend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ECommerceBackend.IntegrationTests;

public sealed class ProductReviewEligibilityTests : IClassFixture<IntegrationTestFactory>
{
    private readonly IntegrationTestFactory _factory;

    public ProductReviewEligibilityTests(IntegrationTestFactory factory) => _factory = factory;

    [Fact]
    public async Task Customer_Can_Review_Completed_Order_When_Recipient_Customer_Differs_From_Account_Profile()
    {
        int variantId;

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
            var account = await db.Users.FirstAsync(item => item.Userid == _factory.Seed.CustomerAUserId);
            var product = await db.Products.FirstAsync(item => item.Productname == "Integration Phone");
            var recipient = new Customer
            {
                Fullname = "Different Recipient",
                Email = "recipient@example.test",
                Phone = "0900999999",
                Address = "Different delivery address",
                Createdat = DateTime.UtcNow
            };
            var variant = new Productvariant
            {
                Product = product,
                Sku = $"IT-REVIEW-{Guid.NewGuid():N}",
                Baseprice = 1_100_000m,
                Condition = "New",
                Imageurls = "[]",
                Specifications = "{}"
            };
            var inventory = new Inventoryitem
            {
                Imei = $"IT-REVIEW-IMEI-{Guid.NewGuid():N}",
                Variant = variant,
                Status = "Sold",
                Importedat = DateTime.UtcNow
            };
            var order = new Order
            {
                User = account,
                Customer = recipient,
                Orderdate = DateTime.UtcNow,
                Totalamount = 1_100_000m,
                Finalamount = 1_100_000m,
                Paymentmethod = "BANK",
                Paymentstatus = "Paid",
                Paidamount = 1_100_000m,
                Requiredpayment = 1_100_000m,
                Checkouttype = "Member",
                Orderstatus = "Completed",
                Shippingname = recipient.Fullname,
                Shippingphone = recipient.Phone,
                Shippingemail = recipient.Email,
                Shippingaddress = recipient.Address
            };
            order.Orderitems.Add(new Orderitem
            {
                ImeiNavigation = inventory,
                Sellingprice = 1_100_000m
            });

            db.Orders.Add(order);
            await db.SaveChangesAsync();
            variantId = variant.Variantid;
        }

        using var customer = await _factory.CreateAuthenticatedClientAsync("it_customer_a");
        var response = await customer.PostAsJsonAsync(
            "/api/Reviews",
            new CreateReviewRequestDto(variantId, 5, "San pham tot"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        await using var verifyScope = _factory.Services.CreateAsyncScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<ECommerceContext>();
        Assert.True(await verifyDb.Reviews.AnyAsync(item =>
            item.Variantid == variantId &&
            item.Customerid != null));
    }

    [Fact]
    public async Task Customer_Cannot_Review_Another_Customers_Completed_Order()
    {
        using var customer = await _factory.CreateAuthenticatedClientAsync("it_customer_b");
        var response = await customer.PostAsJsonAsync(
            "/api/Reviews",
            new CreateReviewRequestDto(_factory.Seed.CheckoutVariantId, 5, "Not my purchase"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
