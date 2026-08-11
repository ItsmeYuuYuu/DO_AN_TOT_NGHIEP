using System.Net;
using System.Net.Http.Json;
using ECommerceBackend.DTOs.Orders;
using ECommerceBackend.DTOs.Vouchers;
using ECommerceBackend.IntegrationTests.Infrastructure;
using ECommerceBackend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ECommerceBackend.IntegrationTests;

public sealed class VoucherConditionTests : IClassFixture<IntegrationTestFactory>
{
    private readonly IntegrationTestFactory _factory;

    public VoucherConditionTests(IntegrationTestFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Checkout_Applies_Percentage_Voucher_To_Selected_Product_With_Maximum_Cap()
    {
        int productId;
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
            productId = await db.Productvariants
                .Where(variant => variant.Variantid == _factory.Seed.CheckoutVariantId)
                .Select(variant => variant.Productid!.Value)
                .SingleAsync();
        }

        using var admin = await _factory.CreateAuthenticatedClientAsync("it_admin");
        var createVoucher = await admin.PostAsJsonAsync("/api/Vouchers", new CreateVoucherRequestDto(
            "ITCAP200",
            null,
            50,
            500_000m,
            200_000m,
            [productId],
            DateTime.UtcNow.AddDays(-1),
            DateTime.UtcNow.AddDays(1),
            true));
        Assert.Equal(HttpStatusCode.Created, createVoucher.StatusCode);

        using var customer = await _factory.CreateAuthenticatedClientAsync("it_customer_a");
        var validate = await customer.PostAsJsonAsync("/api/Vouchers/validate", new ValidateVoucherRequestDto(
            "ITCAP200",
            [new VoucherCartItemDto(_factory.Seed.CheckoutVariantId, 1)]));
        var validation = await validate.Content.ReadFromJsonAsync<VoucherValidationDto>();
        Assert.Equal(HttpStatusCode.OK, validate.StatusCode);
        Assert.NotNull(validation);
        Assert.Equal(900_000m, validation.Eligiblesubtotal);
        Assert.Equal(200_000m, validation.Discountamount);

        var orderResponse = await customer.PostAsJsonAsync("/api/Orders", new CreateOrderRequestDto(
            _factory.Seed.CustomerAUserId,
            "COD",
            "ITCAP200",
            [new CreateOrderItemRequestDto(_factory.Seed.CheckoutVariantId, 1)],
            "12 Nguyễn Huệ, Quận 1, Thành phố Hồ Chí Minh",
            "Voucher integration checkout",
            null,
            "Integration Customer A",
            "0900000001",
            "it.a@example.test",
            "Thành phố Hồ Chí Minh",
            "Phường Bến Nghé"));
        var createdOrder = await orderResponse.Content.ReadFromJsonAsync<OrderDetailDto>();

        Assert.Equal(HttpStatusCode.Created, orderResponse.StatusCode);
        Assert.NotNull(createdOrder);
        Assert.Equal(900_000m, createdOrder.Totalamount);
        Assert.Equal(200_000m, createdOrder.Discountamount);
        Assert.Equal(730_000m, createdOrder.Finalamount);
    }

    [Fact]
    public async Task Validation_Rejects_Cart_Without_An_Eligible_Product()
    {
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
            var excludedProduct = new Product
            {
                Productname = "Voucher Excluded Product",
                Slug = "voucher-excluded-product",
                Seriesname = "Voucher Test",
                Createdat = DateTime.UtcNow,
                Isactive = true
            };
            db.Products.Add(excludedProduct);
            await db.SaveChangesAsync();

            db.Vouchers.Add(new Voucher
            {
                Vouchercode = "ITOTHER",
                Discountamount = 100_000m,
                Minimumorderamount = 100_000m,
                Applicableproductids = [excludedProduct.Productid],
                Validfrom = DateTime.UtcNow.AddDays(-1),
                Validto = DateTime.UtcNow.AddDays(1),
                Isactive = true
            });
            await db.SaveChangesAsync();
        }

        using var customer = await _factory.CreateAuthenticatedClientAsync("it_customer_b");
        var response = await customer.PostAsJsonAsync("/api/Vouchers/validate", new ValidateVoucherRequestDto(
            "ITOTHER",
            [new VoucherCartItemDto(_factory.Seed.CheckoutVariantId, 1)]));
        var error = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.NotNull(error);
        Assert.Contains("không áp dụng", error["message"].ToString(), StringComparison.OrdinalIgnoreCase);
    }
}
