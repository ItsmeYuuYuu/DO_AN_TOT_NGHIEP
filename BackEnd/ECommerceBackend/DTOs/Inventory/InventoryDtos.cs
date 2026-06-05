using System;
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
        string? Warrantystatus = null
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
}
