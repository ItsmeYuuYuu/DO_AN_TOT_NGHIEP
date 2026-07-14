using System.Net;
using System.Net.Http.Json;
using ECommerceBackend.DTOs.Orders;
using ECommerceBackend.DTOs.Returns;
using ECommerceBackend.IntegrationTests.Infrastructure;
using ECommerceBackend.Controllers;

namespace ECommerceBackend.IntegrationTests;

public sealed class OrderReturnSecurityTests : IClassFixture<IntegrationTestFactory>
{
    private readonly IntegrationTestFactory _factory;

    public OrderReturnSecurityTests(IntegrationTestFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Customer_Cannot_View_Another_Customers_Order_Or_Return()
    {
        using var customerB = await _factory.CreateAuthenticatedClientAsync("it_customer_b");

        var orderResponse = await customerB.GetAsync($"/api/Orders/{_factory.Seed.CustomerAOrderId}");
        var returnResponse = await customerB.GetAsync($"/api/ReturnRequests/{_factory.Seed.CustomerAReturnId}");

        Assert.Equal(HttpStatusCode.Forbidden, orderResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, returnResponse.StatusCode);
    }

    [Fact]
    public async Task Owner_Can_View_Own_Order_And_Return()
    {
        using var customerA = await _factory.CreateAuthenticatedClientAsync("it_customer_a");

        var orderResponse = await customerA.GetAsync($"/api/Orders/{_factory.Seed.CustomerAOrderId}");
        var returnResponse = await customerA.GetAsync($"/api/ReturnRequests/{_factory.Seed.CustomerAReturnId}");

        Assert.Equal(HttpStatusCode.OK, orderResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, returnResponse.StatusCode);
    }

    [Fact]
    public async Task Duplicate_Refund_Transaction_Reference_Is_Rejected()
    {
        using var admin = await _factory.CreateAuthenticatedClientAsync("it_admin");
        const string transactionReference = "IT-REFUND-DUPLICATE-001";

        var first = await admin.PostAsJsonAsync(
            $"/api/ReturnRequests/{_factory.Seed.CustomerAReturnId}/refund",
            new ProcessRefundDto(900_000m, "Bank", transactionReference, "First transfer"));
        var duplicate = await admin.PostAsJsonAsync(
            $"/api/ReturnRequests/{_factory.Seed.SecondReturnId}/refund",
            new ProcessRefundDto(900_000m, "Bank", transactionReference, "Duplicate transfer"));

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);
    }

    [Fact]
    public async Task Authenticated_Customer_Can_Create_Local_Cod_Order()
    {
        using var customerA = await _factory.CreateAuthenticatedClientAsync("it_customer_a");
        var payload = new CreateOrderRequestDto(
            _factory.Seed.CustomerAUserId,
            "COD",
            null,
            [new CreateOrderItemRequestDto(_factory.Seed.CheckoutVariantId, 1)],
            "12 Nguyễn Huệ, Quận 1, Thành phố Hồ Chí Minh",
            "Integration checkout",
            null,
            "Integration Customer A",
            "0900000001",
            "it.a@example.test");

        var response = await customerA.PostAsJsonAsync("/api/Orders", payload);
        var created = await response.Content.ReadFromJsonAsync<OrderDetailDto>();

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.NotNull(created);
        Assert.Equal("Pending", created.Orderstatus);
        Assert.Equal("COD", created.Paymentmethod);
        Assert.Equal(900_000m, created.Finalamount);
    }

    [Fact]
    public async Task Image_Cleanup_Deletes_Only_Old_Unreferenced_Product_Images()
    {
        var (referencedFile, unusedFile) = await _factory.SeedCleanupImagesAsync();
        using var admin = await _factory.CreateAuthenticatedClientAsync("it_admin");

        var response = await admin.PostAsync("/api/ProductImages/cleanup-unused?olderThanHours=24", null);
        var result = await response.Content.ReadFromJsonAsync<ProductImageCleanupResultDto>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(result);
        Assert.Equal(2, result.ScannedFiles);
        Assert.Equal(1, result.ReferencedFiles);
        Assert.Equal(1, result.DeletedFiles);
        Assert.Contains(unusedFile, result.DeletedFileNames);
        Assert.DoesNotContain(referencedFile, result.DeletedFileNames);
    }
}
