using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace ECommerceBackend.DTOs.Attributes
{
    public record AttributeDto(
        int Attributeid,
        string Attributename,
        List<AttributeValueDto>? Values
    );

    public record AttributeValueDto(
        int Valueid,
        int? Attributeid,
        string Valuename,
        string? Attributename
    );

    public record CreateAttributeRequestDto(
        [Required(ErrorMessage = "Tên thuộc tính là bắt buộc")]
        [StringLength(100, ErrorMessage = "Tên thuộc tính không quá 100 ký tự")]
        string Attributename
    );

    public record UpdateAttributeRequestDto(
        [Required(ErrorMessage = "Tên thuộc tính là bắt buộc")]
        [StringLength(100, ErrorMessage = "Tên thuộc tính không quá 100 ký tự")]
        string Attributename
    );

    public record CreateAttributeValueRequestDto(
        [Required(ErrorMessage = "Attribute ID là bắt buộc")]
        int? Attributeid,

        [Required(ErrorMessage = "Tên giá trị là bắt buộc")]
        [StringLength(100, ErrorMessage = "Tên giá trị không quá 100 ký tự")]
        string Valuename
    );

    public record UpdateAttributeValueRequestDto(
        [Required(ErrorMessage = "Tên giá trị là bắt buộc")]
        [StringLength(100, ErrorMessage = "Tên giá trị không quá 100 ký tự")]
        string Valuename
    );
}
