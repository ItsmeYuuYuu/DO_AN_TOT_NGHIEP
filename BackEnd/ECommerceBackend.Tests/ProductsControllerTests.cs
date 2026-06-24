using System.Net;
using System.Net.Http.Json;
using ECommerceBackend.DTOs.Products;
using ECommerceBackend.Models;
using ECommerceBackend.Services;
using Microsoft.Extensions.DependencyInjection;

namespace ECommerceBackend.Tests;

public class ProductsControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public ProductsControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task SeedSearchCatalogAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
        await db.Database.EnsureDeletedAsync();
        await db.Database.EnsureCreatedAsync();

        var brand = new Brand
        {
            Brandid = 1,
            Brandname = "Google Pixel"
        };
        var series = new Productseries
        {
            Seriesid = 1,
            Brandid = brand.Brandid,
            Brand = brand,
            Seriesname = "Pixel Pro",
            Isactive = true
        };
        var product = new Product
        {
            Productid = 1,
            Brandid = brand.Brandid,
            Seriesid = series.Seriesid,
            Brand = brand,
            Series = series,
            Slug = "google-pixel-10-pro",
            Productname = "Google Pixel 10 Pro",
            Description = "Điện thoại camera cao cấp"
        };

        db.Brands.Add(brand);
        db.Productseries.Add(series);
        db.Products.Add(product);
        await db.SaveChangesAsync();
    }

    [Theory]
    [InlineData("google pixel 10 pro")]
    [InlineData("google pixel")]
    [InlineData("pixel pro")]
    [InlineData("CAMERA CAO CẤP")]
    public async Task SearchProducts_IsCaseInsensitiveAcrossProductBrandSeriesAndDescription(
        string query)
    {
        await SeedSearchCatalogAsync();

        var response = await _client.GetAsync(
            $"/api/Products/search?q={Uri.EscapeDataString(query)}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var products = await response.Content.ReadFromJsonAsync<List<ProductListItemDto>>();
        var product = Assert.Single(products!);
        Assert.Equal("Google Pixel 10 Pro", product.Productname);
    }

    [Fact]
    public async Task GetProductBySlug_ReturnsProductDetail()
    {
        await SeedSearchCatalogAsync();

        var response = await _client.GetAsync("/api/Products/by-slug/google-pixel-10-pro/full-detail");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var product = await response.Content.ReadFromJsonAsync<FullProductDetailDto>();
        Assert.NotNull(product);
        Assert.Equal(1, product!.Productid);
        Assert.Equal("google-pixel-10-pro", product.Slug);
    }

    [Theory]
    [InlineData("Google Pixel 10 Pro", "google-pixel-10-pro")]
    [InlineData("Điện thoại Xiaomi 17", "dien-thoai-xiaomi-17")]
    public void GenerateBaseSlug_NormalizesVietnameseText(string productName, string expectedSlug)
    {
        var slug = ProductSlugService.GenerateBaseSlug(productName);

        Assert.Equal(expectedSlug, slug);
    }
}
