using System.ComponentModel.DataAnnotations;

namespace ECommerceBackend.DTOs.Sliders
{
    public record SliderDto(
        int Sliderid,
        string Title,
        string Imageurl,
        string? Linkurl,
        int? Displayorder,
        bool? Isactive
    );

    public record CreateSliderRequestDto(
        [Required(ErrorMessage = "Tiêu đề slider là bắt buộc")]
        [StringLength(200, ErrorMessage = "Tiêu đề không quá 200 ký tự")]
        string Title,

        [Required(ErrorMessage = "Đường dẫn ảnh là bắt buộc")]
        [StringLength(500, ErrorMessage = "Đường dẫn ảnh không quá 500 ký tự")]
        string Imageurl,

        [StringLength(500, ErrorMessage = "Đường dẫn link không quá 500 ký tự")]
        string? Linkurl,

        [Range(0, int.MaxValue, ErrorMessage = "Thứ tự hiển thị không hợp lệ")]
        int? Displayorder,

        bool? Isactive
    );

    public record UpdateSliderRequestDto(
        [Required(ErrorMessage = "Tiêu đề slider là bắt buộc")]
        [StringLength(200, ErrorMessage = "Tiêu đề không quá 200 ký tự")]
        string Title,

        [Required(ErrorMessage = "Đường dẫn ảnh là bắt buộc")]
        [StringLength(500, ErrorMessage = "Đường dẫn ảnh không quá 500 ký tự")]
        string Imageurl,

        [StringLength(500, ErrorMessage = "Đường dẫn link không quá 500 ký tự")]
        string? Linkurl,

        [Range(0, int.MaxValue, ErrorMessage = "Thứ tự hiển thị không hợp lệ")]
        int? Displayorder,

        bool? Isactive
    );
}
