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
        [RegularExpression(
            @"^(?=.{8,}$)(?!.*\s)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).*$",
            ErrorMessage = "Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt")]
        string NewPassword
    );

    public record RegisterRequestDto(
        [Required(ErrorMessage = "Tên đăng nhập không được để trống")]
        [StringLength(50, MinimumLength = 3, ErrorMessage = "Tên đăng nhập từ 3-50 ký tự")]
        string Username,

        [Required(ErrorMessage = "Mật khẩu không được để trống")]
        [RegularExpression(
            @"^(?=.{8,}$)(?!.*\s)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).*$",
            ErrorMessage = "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt")]
        string Password,

        [Required(ErrorMessage = "Họ tên không được để trống")]
        [StringLength(100, MinimumLength = 2, ErrorMessage = "Họ tên phải từ 2-100 ký tự")]
        string Fullname,

        [Required(ErrorMessage = "Email không được để trống")]
        [EmailAddress(ErrorMessage = "Email không hợp lệ")]
        [StringLength(100, ErrorMessage = "Email không được vượt quá 100 ký tự")]
        string Email,

        [Required(ErrorMessage = "Số điện thoại không được để trống")]
        [RegularExpression(@"^0\d{9}$", ErrorMessage = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0")]
        string Phone
    );

    public record ForgotPasswordRequestDto(
        [Required(ErrorMessage = "Email không được để trống")]
        [EmailAddress(ErrorMessage = "Email không hợp lệ")]
        string Email
    );
}
