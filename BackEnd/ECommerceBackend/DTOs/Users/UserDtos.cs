using System;
using System.ComponentModel.DataAnnotations;

namespace ECommerceBackend.DTOs.Users
{
    public record UserListItemDto(
        int Userid,
        string Username,
        string Fullname,
        string? Email,
        string? Phone,
        int? Roleid,
        string? Rolename,
        bool? Isactive,
        DateTime? Createdat
    );

    public record CreateUserRequestDto(
        [Required(ErrorMessage = "Tên đăng nhập là bắt buộc")] 
        [StringLength(50, MinimumLength = 3, ErrorMessage = "Tên đăng nhập từ 3-50 ký tự")] string Username,
        
        [Required(ErrorMessage = "Mật khẩu là bắt buộc")] 
        [MinLength(6, ErrorMessage = "Mật khẩu tối thiểu 6 ký tự")] string Password,
        
        [Required(ErrorMessage = "Họ tên là bắt buộc")] string Fullname,
        
        [EmailAddress(ErrorMessage = "Email không hợp lệ")] string? Email,
        [Phone(ErrorMessage = "Số điện thoại không hợp lệ")] string? Phone,
        int? Roleid,
        bool? Isactive
    );

    public record UpdateUserRequestDto(
        [Required(ErrorMessage = "Họ tên là bắt buộc")] string Fullname,
        [EmailAddress(ErrorMessage = "Email không hợp lệ")] string? Email,
        [Phone(ErrorMessage = "Số điện thoại không hợp lệ")] string? Phone,
        int? Roleid,
        bool? Isactive,
        [MinLength(6, ErrorMessage = "Mật khẩu mới tối thiểu 6 ký tự")] string? NewPassword
    );

    public record ToggleUserActiveResponseDto(int Userid, bool? Isactive);
}
