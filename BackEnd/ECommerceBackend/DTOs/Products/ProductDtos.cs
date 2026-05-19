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
        List<ProductImageDto>? Productimages
    );

    public record ProductListItemDto(
        int Productid,
        string Productname,
        string? Description,
        DateTime? Createdat,
        LookupDto? Brand,
        LookupDto? Category,
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
            List<ProductVariantDto>? Productvariants
        ) : base(Productid, Productname, Description, Createdat, Brand, Category, Productvariants) { }
    }

    public record CreateProductRequestDto(
        [Required(ErrorMessage = "Tên sản phẩm là bắt buộc")] string Productname,
        string? Description,
        int? Categoryid,
        int? Brandid
    );

    public record UpdateProductRequestDto(
        [Required(ErrorMessage = "Tên sản phẩm là bắt buộc")] string Productname,
        string? Description,
        int? Categoryid,
        int? Brandid
    );

    public record CreateProductVariantRequestDto(
        [Required] int? Productid,
        int? Conditionid,
        [Required] string Sku,
        [Range(0, double.MaxValue, ErrorMessage = "Giá cơ bản không hợp lệ")] decimal Baseprice,
        [Range(0, double.MaxValue, ErrorMessage = "Giá khuyến mãi không hợp lệ")] decimal? Saleprice
    );

    public record UpdateProductVariantRequestDto(
        int? Conditionid,
        [Required] string Sku,
        [Range(0, double.MaxValue, ErrorMessage = "Giá cơ bản không hợp lệ")] decimal Baseprice,
        [Range(0, double.MaxValue, ErrorMessage = "Giá khuyến mãi không hợp lệ")] decimal? Saleprice
    );
}
