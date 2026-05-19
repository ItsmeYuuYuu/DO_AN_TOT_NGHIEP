using System;
using System.ComponentModel.DataAnnotations;

namespace ECommerceBackend.DTOs.Customers
{
    public record CustomerDto(
        int Customerid,
        string Fullname,
        string Phone,
        string? Email,
        string? Address,
        DateTime? Createdat
    );

    public record CreateCustomerRequestDto(
        [Required(ErrorMessage = "Họ tên khách hàng là bắt buộc")]
        [StringLength(100, ErrorMessage = "Họ tên không vượt quá 100 ký tự")]
        string Fullname,

        [Required(ErrorMessage = "Số điện thoại là bắt buộc")]
        [Phone(ErrorMessage = "Số điện thoại không hợp lệ")]
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
        [Phone(ErrorMessage = "Số điện thoại không hợp lệ")]
        string Phone,

        [EmailAddress(ErrorMessage = "Email không hợp lệ")]
        string? Email,

        [StringLength(255, ErrorMessage = "Địa chỉ không vượt quá 255 ký tự")]
        string? Address
    );
}
