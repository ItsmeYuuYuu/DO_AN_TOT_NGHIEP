using System.ComponentModel.DataAnnotations;

namespace ECommerceBackend.DTOs.Categories
{
    public record CategoryDto(int Categoryid, string Categoryname, string? Description, int Productcount);
    
    public record CreateCategoryRequestDto(
        [Required(ErrorMessage = "Tên danh mục là bắt buộc")] 
        [StringLength(100, ErrorMessage = "Tên danh mục không vượt quá 100 ký tự")] string Categoryname, 
        string? Description
    );
    
    public record UpdateCategoryRequestDto(
        [Required(ErrorMessage = "Tên danh mục là bắt buộc")] 
        [StringLength(100, ErrorMessage = "Tên danh mục không vượt quá 100 ký tự")] string Categoryname, 
        string? Description
    );
}
