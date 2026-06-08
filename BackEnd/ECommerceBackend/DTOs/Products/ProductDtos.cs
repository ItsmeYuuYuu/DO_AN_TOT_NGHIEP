using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using ECommerceBackend.DTOs.Common;

namespace ECommerceBackend.DTOs.Products
{
    public record ProductImageDto(int Imageid, string Imageurl, bool? Ismain);
    
    public record ConditionDto(int Conditionid, string Conditionname);

    public record ProductVariantDto(
        int Variantid,
        int? Productid,
        string Sku,
        decimal Baseprice,
        decimal? Saleprice,
        ConditionDto? Condition,
        List<ProductImageDto>? Productimages,
        List<VariantAttributeValueDto>? Attributes = null,
        int? Stockquantity = null
    );

    public record ProductListItemDto(
        int Productid,
        string Productname,
        string? Description,
        DateTime? Createdat,
        LookupDto? Brand,
        LookupDto? Category,
        LookupDto? Series,
        List<ProductVariantDto>? Productvariants
    );

    public record ProductDetailDto : ProductListItemDto
    {
        public ProductDetailDto(
            int Productid,
            string Productname,
            string? Description,
            DateTime? Createdat,
            LookupDto? Brand,
            LookupDto? Category,
            LookupDto? Series,
            List<ProductVariantDto>? Productvariants
        ) : base(Productid, Productname, Description, Createdat, Brand, Category, Series, Productvariants) { }
    }

    public record ReviewSummaryDto(double AvgRating, int TotalReviews, int Star5, int Star4, int Star3, int Star2, int Star1);
    
    public record VariantAttributeValueDto(int Valueid, string Valuename, string Attributename);

    public record FullProductDetailDto : ProductListItemDto
    {
        public ReviewSummaryDto? ReviewSummary { get; init; }
        public List<ProductListItemDto>? RelatedProducts { get; init; }

        public FullProductDetailDto(
            int Productid,
            string Productname,
            string? Description,
            DateTime? Createdat,
            LookupDto? Brand,
            LookupDto? Category,
            LookupDto? Series,
            List<ProductVariantDto>? Productvariants,
            ReviewSummaryDto? ReviewSummary = null,
            List<ProductListItemDto>? RelatedProducts = null
        ) : base(Productid, Productname, Description, Createdat, Brand, Category, Series, Productvariants)
        {
            this.ReviewSummary = ReviewSummary;
            this.RelatedProducts = RelatedProducts;
        }
    }

    public record CreateProductRequestDto(
        [Required(ErrorMessage = "Tên sản phẩm là bắt buộc")] string Productname,
        string? Description,
        int? Categoryid,
        int? Brandid,
        int? Seriesid
    );

    public record UpdateProductRequestDto(
        [Required(ErrorMessage = "Tên sản phẩm là bắt buộc")] string Productname,
        string? Description,
        int? Categoryid,
        int? Brandid,
        int? Seriesid
    );

    public record CreateProductVariantRequestDto(
        [Required] int? Productid,
        string? Condition,
        [Required] string Sku,
        [Range(0, double.MaxValue, ErrorMessage = "Giá cơ bản không hợp lệ")] decimal Baseprice,
        [Range(0, double.MaxValue, ErrorMessage = "Giá khuyến mãi không hợp lệ")] decimal? Saleprice,
        string? Specifications = null
    );

    public record UpdateProductVariantRequestDto(
        string? Condition,
        [Required] string Sku,
        [Range(0, double.MaxValue, ErrorMessage = "Giá cơ bản không hợp lệ")] decimal Baseprice,
        [Range(0, double.MaxValue, ErrorMessage = "Giá khuyến mãi không hợp lệ")] decimal? Saleprice,
        string? Specifications = null
    );

    public record VariantSpecDto(
        [Required] string Key,
        [Required] string Value
    );

    public record CreateProductImageDto(
        [Required, StringLength(500)] string Imageurl,
        bool Ismain = false
    );

    public record CreateFullProductVariantDto(
        [StringLength(50, ErrorMessage = "Tình trạng không được vượt quá 50 ký tự")] string? Condition,
        [Required, StringLength(50, ErrorMessage = "SKU không được vượt quá 50 ký tự")] string Sku,
        [Range(0, double.MaxValue, ErrorMessage = "Giá cơ bản không hợp lệ")] decimal Baseprice,
        [Range(0, double.MaxValue, ErrorMessage = "Giá khuyến mãi không hợp lệ")] decimal? Saleprice,
        List<VariantSpecDto>? Specs,
        List<CreateProductImageDto>? Images,
        [Range(0, 10000, ErrorMessage = "Số lượng tồn kho phải từ 0 đến 10000")] int? Quantity = null
    );

    public record CreateFullProductDto(
        [Required(ErrorMessage = "Tên sản phẩm là bắt buộc"), StringLength(200, ErrorMessage = "Tên sản phẩm không được vượt quá 200 ký tự")] string Productname,
        string? Description,
        int? Categoryid,
        int? Brandid,
        int? Seriesid,
        List<CreateFullProductVariantDto>? Variants
    );

    public record UpdateFullProductVariantDto(
        int? Variantid,
        [StringLength(50)] string? Condition,
        [Required, StringLength(50)] string Sku,
        [Range(0, double.MaxValue)] decimal Baseprice,
        [Range(0, double.MaxValue)] decimal? Saleprice,
        List<VariantSpecDto>? Specs,
        List<CreateProductImageDto>? Images,
        [Range(0, 10000)] int Quantity
    );

    public record UpdateFullProductDto(
        [Required, StringLength(200)] string Productname,
        string? Description,
        int? Categoryid,
        int? Brandid,
        int? Seriesid,
        [Required, MinLength(1)] List<UpdateFullProductVariantDto> Variants
    );
}
