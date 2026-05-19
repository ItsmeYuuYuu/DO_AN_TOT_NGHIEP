using System;
using System.ComponentModel.DataAnnotations;

namespace ECommerceBackend.DTOs.Inventory
{
    public record InventoryItemDto(
        string Imei,
        int? Variantid,
        int? Podetailid,
        string? Status,
        DateTime? Importedat,
        string? VariantSku,
        string? ProductName
    );

    public record CreateInventoryItemRequestDto(
        [Required(ErrorMessage = "Mã IMEI là bắt buộc")]
        [StringLength(50, ErrorMessage = "Mã IMEI không quá 50 ký tự")]
        string Imei,

        [Required(ErrorMessage = "Variant ID là bắt buộc")]
        int? Variantid,

        int? Podetailid,

        [StringLength(50, ErrorMessage = "Trạng thái không quá 50 ký tự")]
        string? Status,

        DateTime? Importedat
    );

    public record UpdateInventoryItemRequestDto(
        [Required(ErrorMessage = "Variant ID là bắt buộc")]
        int? Variantid,

        int? Podetailid,

        [StringLength(50, ErrorMessage = "Trạng thái không quá 50 ký tự")]
        string? Status,

        DateTime? Importedat
    );
}
