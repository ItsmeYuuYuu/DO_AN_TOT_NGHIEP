using System;
using System.ComponentModel.DataAnnotations;

namespace ECommerceBackend.DTOs.Warranties
{
    public record WarrantyDto(
        int Warrantyid,
        string? Imei,
        int? Customerid,
        DateTime Startdate,
        DateTime Enddate,
        string? Status,
        string? CustomerName
    );

    public record CreateWarrantyRequestDto(
        [Required(ErrorMessage = "Mã IMEI là bắt buộc")]
        [StringLength(50, ErrorMessage = "Mã IMEI không quá 50 ký tự")]
        string? Imei,

        [Required(ErrorMessage = "Customer ID là bắt buộc")]
        int? Customerid,

        [Required(ErrorMessage = "Ngày bắt đầu là bắt buộc")]
        DateTime Startdate,

        [Required(ErrorMessage = "Ngày kết thúc là bắt buộc")]
        DateTime Enddate,

        [StringLength(50, ErrorMessage = "Trạng thái không quá 50 ký tự")]
        string? Status
    );

    public record UpdateWarrantyRequestDto(
        [Required(ErrorMessage = "Mã IMEI là bắt buộc")]
        [StringLength(50, ErrorMessage = "Mã IMEI không quá 50 ký tự")]
        string? Imei,

        [Required(ErrorMessage = "Customer ID là bắt buộc")]
        int? Customerid,

        [Required(ErrorMessage = "Ngày bắt đầu là bắt buộc")]
        DateTime Startdate,

        [Required(ErrorMessage = "Ngày kết thúc là bắt buộc")]
        DateTime Enddate,

        [StringLength(50, ErrorMessage = "Trạng thái không quá 50 ký tự")]
        string? Status
    );
}
