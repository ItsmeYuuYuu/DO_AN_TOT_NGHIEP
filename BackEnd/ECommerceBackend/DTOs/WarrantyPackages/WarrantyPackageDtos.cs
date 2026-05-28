using System.ComponentModel.DataAnnotations;

namespace ECommerceBackend.DTOs.WarrantyPackages
{
    public record WarrantyPackageDto(
        int Packageid,
        string Packagename,
        int Durationmonths,
        decimal Price
    );

    public record CreateWarrantyPackageRequestDto(
        [Required, StringLength(100, MinimumLength = 3, ErrorMessage = "Tên gói bảo hành phải từ 3 đến 100 ký tự.")] string Packagename,
        [Range(1, 120, ErrorMessage = "Thời hạn bảo hành (tháng) phải từ 1 đến 120.")] int Durationmonths,
        [Range(0, 1000000000, ErrorMessage = "Giá gói bảo hành không hợp lệ.")] decimal Price
    );

    public record UpdateWarrantyPackageRequestDto(
        [Required, StringLength(100, MinimumLength = 3, ErrorMessage = "Tên gói bảo hành phải từ 3 đến 100 ký tự.")] string Packagename,
        [Range(1, 120, ErrorMessage = "Thời hạn bảo hành (tháng) phải từ 1 đến 120.")] int Durationmonths,
        [Range(0, 1000000000, ErrorMessage = "Giá gói bảo hành không hợp lệ.")] decimal Price
    );
}
