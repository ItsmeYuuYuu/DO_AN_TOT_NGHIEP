using System.ComponentModel.DataAnnotations;

namespace ECommerceBackend.DTOs.Brands
{
    public record BrandDto(int Brandid, string Brandname);
    
    public record CreateBrandRequestDto(
        [Required(ErrorMessage = "Tên thương hiệu là bắt buộc")] 
        [StringLength(100, ErrorMessage = "Tên thương hiệu không vượt quá 100 ký tự")] string Brandname
    );
    
    public record UpdateBrandRequestDto(
        [Required(ErrorMessage = "Tên thương hiệu là bắt buộc")] 
        [StringLength(100, ErrorMessage = "Tên thương hiệu không vượt quá 100 ký tự")] string Brandname
    );
}
