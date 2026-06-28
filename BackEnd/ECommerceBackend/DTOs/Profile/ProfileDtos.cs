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
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Họ tên từ 2 đến 100 ký tự")]
    string Fullname,

    [EmailAddress(ErrorMessage = "Email không hợp lệ")]
    string? Email,

    [RegularExpression(@"^0\d{9}$", ErrorMessage = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0")]
    string? Phone
);
