using System;
using System.ComponentModel.DataAnnotations;

namespace ECommerceBackend.DTOs.Reviews
{
    public record ReviewDto(
        int Reviewid,
        int? Variantid,
        int? Customerid,
        int? Rating,
        string? Comment,
        DateTime? Createdat,
        string? CustomerName,
        string? VariantSku
    );

    public record CreateReviewRequestDto(
        [Required(ErrorMessage = "Variant ID là bắt buộc")] int? Variantid,
        [Required(ErrorMessage = "Customer ID là bắt buộc")] int? Customerid,
        [Range(1, 5, ErrorMessage = "Đánh giá phải từ 1 đến 5 sao")] int Rating,
        [StringLength(1000, ErrorMessage = "Nội dung đánh giá không vượt quá 1000 ký tự")] string? Comment
    );

    public record UpdateReviewRequestDto(
        [Range(1, 5, ErrorMessage = "Đánh giá phải từ 1 đến 5 sao")] int Rating,
        [StringLength(1000, ErrorMessage = "Nội dung đánh giá không vượt quá 1000 ký tự")] string? Comment
    );
}
