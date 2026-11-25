using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace ECommerceBackend.DTOs.Inventory
{
    public record InventoryItemDto(
        string Imei,
        int? Variantid,
        string? Status,
        DateTime? Importedat,
        string? VariantSku,
        string? ProductName,
        DateTime? Warrantystartdate = null,
        DateTime? Warrantyenddate = null,
        string? Warrantystatus = null,
        string? BrandName = null
    );

    public record CreateInventoryItemRequestDto(
        [Required(ErrorMessage = "Mã IMEI là bắt buộc")]
        [StringLength(50, ErrorMessage = "Mã IMEI không quá 50 ký tự")]
        string Imei,

        [Required(ErrorMessage = "Variant ID là bắt buộc")]
        int? Variantid,

        [StringLength(50, ErrorMessage = "Trạng thái không quá 50 ký tự")]
        string? Status,

        DateTime? Importedat,

        DateTime? Warrantystartdate = null,
        DateTime? Warrantyenddate = null,
        string? Warrantystatus = null
    );

    public record UpdateInventoryItemRequestDto(
        [Required(ErrorMessage = "Variant ID là bắt buộc")]
        int? Variantid,

        [StringLength(50, ErrorMessage = "Trạng thái không quá 50 ký tự")]
        string? Status,

        DateTime? Importedat,

        DateTime? Warrantystartdate = null,
        DateTime? Warrantyenddate = null,
        string? Warrantystatus = null
    );

    public record CorrectInventoryImeiRequestDto(
        [Required(ErrorMessage = "IMEI is required")]
        [StringLength(15, MinimumLength = 15, ErrorMessage = "IMEI must contain exactly 15 digits")]
        string Imei
    );

    public record LowStockVariantDto(
        int Variantid,
        string? VariantSku,
        string? ProductName,
        int InStockQuantity,
        int Threshold
    );

    public record InventoryVariantOptionDto(
        int Variantid,
        string Sku,
        string ProductName,
        string? Condition,
        int InStockQuantity
    );

    public record BatchImportInventoryRequestDto(
        [Required(ErrorMessage = "Biến thể sản phẩm là bắt buộc")]
        int? Variantid,

        [Required(ErrorMessage = "Danh sách IMEI là bắt buộc")]
        [MinLength(1, ErrorMessage = "Phải nhập ít nhất một IMEI")]
        [MaxLength(500, ErrorMessage = "Mỗi lần chỉ được nhập tối đa 500 IMEI")]
        List<string> Imeis,

        DateTime? Importedat = null
    );

    public record BatchImportInventoryResultDto(
        int Variantid,
        string Sku,
        int ImportedCount,
        IReadOnlyList<string> Imeis
    );
}
