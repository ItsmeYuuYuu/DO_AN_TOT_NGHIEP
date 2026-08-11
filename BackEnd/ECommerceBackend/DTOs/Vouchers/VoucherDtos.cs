using System;
using System.ComponentModel.DataAnnotations;

namespace ECommerceBackend.DTOs.Vouchers
{
    public record VoucherDto(
        string Vouchercode,
        decimal? Discountamount,
        double? Discountpercentage,
        decimal? Minimumorderamount,
        decimal? Maximumdiscountamount,
        int[] Applicableproductids,
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

        [Range(0, double.MaxValue, ErrorMessage = "Giá trị đơn tối thiểu không hợp lệ")]
        decimal? Minimumorderamount,

        [Range(0, double.MaxValue, ErrorMessage = "Mức giảm tối đa không hợp lệ")]
        decimal? Maximumdiscountamount,

        int[]? Applicableproductids,

        DateTime? Validfrom,
        DateTime? Validto,
        bool? Isactive
    );

    public record UpdateVoucherRequestDto(
        [Range(0, double.MaxValue, ErrorMessage = "Số tiền giảm giá không hợp lệ")]
        decimal? Discountamount,

        [Range(0, 100, ErrorMessage = "Phần trăm giảm giá phải từ 0 đến 100")]
        double? Discountpercentage,

        [Range(0, double.MaxValue, ErrorMessage = "Giá trị đơn tối thiểu không hợp lệ")]
        decimal? Minimumorderamount,

        [Range(0, double.MaxValue, ErrorMessage = "Mức giảm tối đa không hợp lệ")]
        decimal? Maximumdiscountamount,

        int[]? Applicableproductids,

        DateTime? Validfrom,
        DateTime? Validto,
        bool? Isactive
    );

    public record VoucherCartItemDto(
        [Range(1, int.MaxValue)] int Variantid,
        [Range(1, 1000)] int Quantity
    );

    public record ValidateVoucherRequestDto(
        [Required, StringLength(50)] string Vouchercode,
        [Required, MinLength(1)] List<VoucherCartItemDto> Items
    );

    public record VoucherValidationDto(
        string Vouchercode,
        decimal Discountamount,
        decimal Eligiblesubtotal,
        decimal? Minimumorderamount,
        decimal? Maximumdiscountamount,
        double? Discountpercentage,
        int[] Applicableproductids,
        string Message
    );
}
