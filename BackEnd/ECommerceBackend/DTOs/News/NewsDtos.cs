using System;
using System.ComponentModel.DataAnnotations;

namespace ECommerceBackend.DTOs.News
{
    public record NewsDto(
        int Postid,
        string Title,
        string? Summary,
        string? Content,
        string? Thumbnail,
        int? Userid,
        DateTime? Createdat,
        bool? Isactive,
        string? AuthorName
    );

    public record CreateNewsRequestDto(
        [Required(ErrorMessage = "Tiêu đề tin tức là bắt buộc")]
        [StringLength(255, ErrorMessage = "Tiêu đề không quá 255 ký tự")]
        string Title,

        [StringLength(500, ErrorMessage = "Tóm tắt không quá 500 ký tự")]
        string? Summary,

        string? Content,

        string? Thumbnail,

        [Required(ErrorMessage = "Mã tác giả là bắt buộc")]
        int? Userid,

        bool? Isactive
    );

    public record UpdateNewsRequestDto(
        [Required(ErrorMessage = "Tiêu đề tin tức là bắt buộc")]
        [StringLength(255, ErrorMessage = "Tiêu đề không quá 255 ký tự")]
        string Title,

        [StringLength(500, ErrorMessage = "Tóm tắt không quá 500 ký tự")]
        string? Summary,

        string? Content,

        string? Thumbnail,

        bool? Isactive
    );
}
