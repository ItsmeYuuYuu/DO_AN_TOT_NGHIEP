using System.ComponentModel.DataAnnotations;
using ECommerceBackend.Validation;

namespace ECommerceBackend.DTOs.Users;

public record UserListItemDto(
    int Userid,
    string Username,
    string Fullname,
    string? Email,
    string? Phone,
    int? Roleid,
    string? Rolename,
    bool? Isactive,
    DateTime? Createdat,
    IReadOnlyList<int>? Roleids = null,
    IReadOnlyList<string>? Rolenames = null,
    IReadOnlyList<string>? Permissions = null);

public record CreateUserRequestDto(
    [Required(ErrorMessage = "Tên đăng nhập là bắt buộc")]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "Tên đăng nhập từ 3-50 ký tự")]
    [RegularExpression(@"^[A-Za-z0-9._\-]+$", ErrorMessage = "Tên đăng nhập chứa ký tự không hợp lệ")]
    string Username,
    [Required(ErrorMessage = "Mật khẩu là bắt buộc")]
    [MinLength(8, ErrorMessage = "Mật khẩu tối thiểu 8 ký tự")]
    string Password,
    [Required(ErrorMessage = "Họ tên là bắt buộc")]
    [StringLength(100)]
    [SafeText(ErrorMessage = "Họ tên chứa nội dung không an toàn")]
    string Fullname,
    [EmailAddress(ErrorMessage = "Email không hợp lệ")]
    [StringLength(100)]
    string? Email,
    [RegularExpression(@"^0\d{9}$", ErrorMessage = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0")]
    string? Phone,
    int? Roleid,
    bool? Isactive,
    IReadOnlyList<int>? Roleids = null);

public record UpdateUserRequestDto(
    [Required(ErrorMessage = "Họ tên là bắt buộc")]
    [StringLength(100)]
    [SafeText(ErrorMessage = "Họ tên chứa nội dung không an toàn")]
    string Fullname,
    [EmailAddress(ErrorMessage = "Email không hợp lệ")]
    [StringLength(100)]
    string? Email,
    [RegularExpression(@"^0\d{9}$", ErrorMessage = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0")]
    string? Phone,
    int? Roleid,
    bool? Isactive,
    [MinLength(8, ErrorMessage = "Mật khẩu mới tối thiểu 8 ký tự")]
    string? NewPassword,
    IReadOnlyList<int>? Roleids = null);

public record ToggleUserActiveResponseDto(int Userid, bool? Isactive);
