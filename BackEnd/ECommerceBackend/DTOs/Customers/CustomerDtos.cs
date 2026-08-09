using System;
using System.ComponentModel.DataAnnotations;

namespace ECommerceBackend.DTOs.Customers
{
    public record CustomerDto(
        Guid Customerid,
        string Fullname,
        string Phone,
        string? Email,
        string? Address,
        DateTime? Createdat,
        int? Userid,
        bool? Accountisactive
    );

    public record UpdateCustomerAccountStatusDto(
        bool Isactive
    );

    public record CreateCustomerRequestDto(
        [Required(ErrorMessage = "Họ tên khách hàng là bắt buộc")]
        [StringLength(100, ErrorMessage = "Họ tên không vượt quá 100 ký tự")]
        string Fullname,

        [Required(ErrorMessage = "Số điện thoại là bắt buộc")]
        [RegularExpression(@"^0\d{9}$", ErrorMessage = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0")]
        string Phone,

        [EmailAddress(ErrorMessage = "Email không hợp lệ")]
        string? Email,

        [StringLength(255, ErrorMessage = "Địa chỉ không vượt quá 255 ký tự")]
        string? Address
    );

    public record UpdateCustomerRequestDto(
        [Required(ErrorMessage = "Họ tên khách hàng là bắt buộc")]
        [StringLength(100, ErrorMessage = "Họ tên không vượt quá 100 ký tự")]
        string Fullname,

        [Required(ErrorMessage = "Số điện thoại là bắt buộc")]
        [RegularExpression(@"^0\d{9}$", ErrorMessage = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0")]
        string Phone,

        [EmailAddress(ErrorMessage = "Email không hợp lệ")]
        string? Email,

        [StringLength(255, ErrorMessage = "Địa chỉ không vượt quá 255 ký tự")]
        string? Address
    );
}
