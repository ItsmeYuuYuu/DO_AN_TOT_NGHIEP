using System.ComponentModel.DataAnnotations;

namespace ECommerceBackend.DTOs.Suppliers
{
    public record SupplierDto(
        int Supplierid,
        string Suppliername,
        string? Contactphone,
        string? Address
    );

    public record CreateSupplierRequestDto(
        [Required(ErrorMessage = "Tên nhà cung cấp là bắt buộc")]
        [StringLength(100, ErrorMessage = "Tên nhà cung cấp không quá 100 ký tự")]
        string Suppliername,

        [Phone(ErrorMessage = "Số điện thoại không hợp lệ")]
        string? Contactphone,

        [StringLength(255, ErrorMessage = "Địa chỉ không quá 255 ký tự")]
        string? Address
    );

    public record UpdateSupplierRequestDto(
        [Required(ErrorMessage = "Tên nhà cung cấp là bắt buộc")]
        [StringLength(100, ErrorMessage = "Tên nhà cung cấp không quá 100 ký tự")]
        string Suppliername,

        [Phone(ErrorMessage = "Số điện thoại không hợp lệ")]
        string? Contactphone,

        [StringLength(255, ErrorMessage = "Địa chỉ không quá 255 ký tự")]
        string? Address
    );
}
