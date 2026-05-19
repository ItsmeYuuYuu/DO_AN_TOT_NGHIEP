using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace ECommerceBackend.DTOs.PurchaseOrders
{
    public record PurchaseOrderDto(
        int Poid,
        int? Supplierid,
        int? Userid,
        DateTime? Importdate,
        decimal Totalamount,
        decimal? Taxfee,
        decimal? Shippingfee,
        string? Status,
        string? SupplierName,
        string? UserFullname,
        List<PurchaseOrderDetailDto> Details
    );

    public record PurchaseOrderDetailDto(
        int Podetailid,
        int? Poid,
        int? Variantid,
        int Quantity,
        decimal Importprice,
        string? VariantSku,
        string? ProductName
    );

    public record CreatePurchaseOrderRequestDto(
        [Required(ErrorMessage = "Supplier ID là bắt buộc")]
        int? Supplierid,

        [Required(ErrorMessage = "User ID là bắt buộc")]
        int? Userid,

        DateTime? Importdate,

        [Range(0, double.MaxValue, ErrorMessage = "Thuế không hợp lệ")]
        decimal? Taxfee,

        [Range(0, double.MaxValue, ErrorMessage = "Phí vận chuyển không hợp lệ")]
        decimal? Shippingfee,

        [StringLength(50, ErrorMessage = "Trạng thái không quá 50 ký tự")]
        string? Status,

        List<CreatePurchaseOrderDetailRequestDto>? Details
    );

    public record CreatePurchaseOrderDetailRequestDto(
        [Required(ErrorMessage = "Variant ID là bắt buộc")]
        int? Variantid,

        [Range(1, int.MaxValue, ErrorMessage = "Số lượng phải lớn hơn 0")]
        int Quantity,

        [Range(0, double.MaxValue, ErrorMessage = "Giá nhập không hợp lệ")]
        decimal Importprice
    );

    public record UpdatePurchaseOrderRequestDto(
        [Required(ErrorMessage = "Supplier ID là bắt buộc")]
        int? Supplierid,

        [Required(ErrorMessage = "User ID là bắt buộc")]
        int? Userid,

        DateTime? Importdate,

        [Range(0, double.MaxValue, ErrorMessage = "Thuế không hợp lệ")]
        decimal? Taxfee,

        [Range(0, double.MaxValue, ErrorMessage = "Phí vận chuyển không hợp lệ")]
        decimal? Shippingfee,

        [StringLength(50, ErrorMessage = "Trạng thái không quá 50 ký tự")]
        string? Status
    );
}
