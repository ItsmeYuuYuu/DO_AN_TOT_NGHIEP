using System;
using System.ComponentModel.DataAnnotations;

namespace ECommerceBackend.DTOs.Vouchers
{
    public record VoucherDto(
        string Vouchercode,
        decimal? Discountamount,
        double? Discountpercentage,
        DateTime? Validfrom,
        DateTime? Validto,
        bool? Isactive
    );

    public record CreateVoucherRequestDto(
        [Required(ErrorMessage = "Mã voucher là bắt buộc")]
        [StringLength(50, ErrorMessage = "Mã voucher không vượt quá 50 ký tự")]
        string Vouchercode,

        [Range(0, double.MaxValue, ErrorMessage = "Số tiền giảm giá không hợp lệ")]
        decimal? Discountamount,

        [Range(0, 100, ErrorMessage = "Phần trăm giảm giá phải từ 0 đến 100")]
        double? Discountpercentage,

        DateTime? Validfrom,
        DateTime? Validto,
        bool? Isactive
    );

    public record UpdateVoucherRequestDto(
        [Range(0, double.MaxValue, ErrorMessage = "Số tiền giảm giá không hợp lệ")]
        decimal? Discountamount,

        [Range(0, 100, ErrorMessage = "Phần trăm giảm giá phải từ 0 đến 100")]
        double? Discountpercentage,

        DateTime? Validfrom,
        DateTime? Validto,
        bool? Isactive
    );
}
