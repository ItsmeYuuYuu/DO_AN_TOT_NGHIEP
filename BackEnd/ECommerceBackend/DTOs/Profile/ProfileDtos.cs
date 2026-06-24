using System.ComponentModel.DataAnnotations;

namespace ECommerceBackend.DTOs.Profile;

public record ProfileDto(
    int Userid,
    string Username,
    string Fullname,
    string? Email,
    string? Phone,
    int? Roleid,
    string? Rolename
);

public record UpdateProfileRequestDto(
    [Required(ErrorMessage = "Ho ten la bat buoc")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Ho ten tu 2 den 100 ky tu")]
    string Fullname,

    [EmailAddress(ErrorMessage = "Email khong hop le")]
    string? Email,

    [Phone(ErrorMessage = "So dien thoai khong hop le")]
    string? Phone
);
