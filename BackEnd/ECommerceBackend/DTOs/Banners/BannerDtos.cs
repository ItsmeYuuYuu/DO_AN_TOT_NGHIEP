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
        [StringLength(500, ErrorMessage = "Đường dẫn ảnh không quá 500 ký tự")]
        string Imageurl,

        [StringLength(500, ErrorMessage = "Đường dẫn link không quá 500 ký tự")]
        string? Linkurl,

        [StringLength(50, ErrorMessage = "Vị trí không quá 50 ký tự")]
        string? Position,

        bool? Isactive
    );

    public record UpdateBannerRequestDto(
        [Required(ErrorMessage = "Đường dẫn ảnh là bắt buộc")]
        [StringLength(500, ErrorMessage = "Đường dẫn ảnh không quá 500 ký tự")]
        string Imageurl,

        [StringLength(500, ErrorMessage = "Đường dẫn link không quá 500 ký tự")]
        string? Linkurl,

        [StringLength(50, ErrorMessage = "Vị trí không quá 50 ký tự")]
        string? Position,

        bool? Isactive
    );
}
