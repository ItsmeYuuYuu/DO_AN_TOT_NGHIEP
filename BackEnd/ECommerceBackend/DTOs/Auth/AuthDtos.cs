using System.ComponentModel.DataAnnotations;

namespace ECommerceBackend.DTOs.Auth
{
    public record LoginRequestDto(
        [Required(ErrorMessage = "Tên đăng nhập không được để trống")] string Username, 
        [Required(ErrorMessage = "Mật khẩu không được để trống")] string Password
    );
    
    public record LoginResponseDto(
        int Userid,
        string Username,
        string Fullname,
        string? Email,
        int? Roleid,
        string Rolename,
        string AccessToken,
        int ExpiresIn
    );

    public record MeResponseDto(
        int Userid,
        string Username,
        string Fullname,
        string? Email,
        int? Roleid,
        string Rolename
    );

    public record ChangePasswordRequestDto(
        [Required] int Userid, 
        [Required(ErrorMessage = "Mật khẩu cũ không được để trống")] string OldPassword, 
        [Required(ErrorMessage = "Mật khẩu mới không được để trống")] 
        [MinLength(6, ErrorMessage = "Mật khẩu mới phải có ít nhất 6 ký tự")] string NewPassword
    );
}
