using System.ComponentModel.DataAnnotations;

namespace ECommerceBackend.DTOs.ProductSeries;

public record ProductSeriesDto(
    int Seriesid,
    int Brandid,
    string Brandname,
    string Seriesname,
    int Displayorder,
    bool Isactive,
    int Productcount
);

public record CreateProductSeriesRequestDto(
    [Required(ErrorMessage = "Thương hiệu là bắt buộc")] int Brandid,
    [Required(ErrorMessage = "Tên dòng máy là bắt buộc")]
    [StringLength(100, ErrorMessage = "Tên dòng máy không vượt quá 100 ký tự")]
    string Seriesname,
    int? Displayorder,
    bool? Isactive
);

public record UpdateProductSeriesRequestDto(
    [Required(ErrorMessage = "Thương hiệu là bắt buộc")] int Brandid,
    [Required(ErrorMessage = "Tên dòng máy là bắt buộc")]
    [StringLength(100, ErrorMessage = "Tên dòng máy không vượt quá 100 ký tự")]
    string Seriesname,
    int? Displayorder,
    bool? Isactive
);
