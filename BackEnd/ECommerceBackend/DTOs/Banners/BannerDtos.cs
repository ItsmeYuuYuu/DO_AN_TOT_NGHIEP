using System.ComponentModel.DataAnnotations;

namespace ECommerceBackend.DTOs.Banners
{
    public record BannerDto(
        int Bannerid,
        string Imageurl,
        string? Linkurl,
        string? Position,
        bool? Isactive
    );

    public record CreateBannerRequestDto(
        [Required(ErrorMessage = "Đường dẫn ảnh là bắt buộc")]
        string Imageurl,

        string? Linkurl,

        [StringLength(50, ErrorMessage = "Vị trí không quá 50 ký tự")]
        string? Position,

        bool? Isactive
    );

    public record UpdateBannerRequestDto(
        [Required(ErrorMessage = "Đường dẫn ảnh là bắt buộc")]
        string Imageurl,

        string? Linkurl,

        [StringLength(50, ErrorMessage = "Vị trí không quá 50 ký tự")]
        string? Position,

        bool? Isactive
    );
}
