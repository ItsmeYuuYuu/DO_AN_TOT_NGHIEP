using System;
using System.ComponentModel.DataAnnotations;

namespace ECommerceBackend.DTOs.PromotionalContents
{
    public record PromotionalContentDto(
        int Contentid,
        string Contenttype,
        string? Title,
        string Imageurl,
        string? Linkurl,
        int? Displayorder,
        bool? Isactive,
        DateTime? Createdat
    );

    public record CreatePromotionalContentRequestDto(
        [Required(ErrorMessage = "Loại nội dung quảng cáo là bắt buộc")]
        [StringLength(50)]
        string Contenttype,

        [StringLength(200)]
        string? Title,

        [Required(ErrorMessage = "Đường dẫn ảnh là bắt buộc")]
        [StringLength(500)]
        string Imageurl,

        [StringLength(500)]
        string? Linkurl,

        int? Displayorder,

        bool? Isactive
    );

    public record UpdatePromotionalContentRequestDto(
        [Required(ErrorMessage = "Loại nội dung quảng cáo là bắt buộc")]
        [StringLength(50)]
        string Contenttype,

        [StringLength(200)]
        string? Title,

        [Required(ErrorMessage = "Đường dẫn ảnh là bắt buộc")]
        [StringLength(500)]
        string Imageurl,

        [StringLength(500)]
        string? Linkurl,

        int? Displayorder,

        bool? Isactive
    );
}
