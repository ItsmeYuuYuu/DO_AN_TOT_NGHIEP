using System.ComponentModel.DataAnnotations;
using ECommerceBackend.Validation;

namespace ECommerceBackend.DTOs.Auth;

public record LoginRequestDto(
    [Required(ErrorMessage = "Tên đăng nhập không được để trống")]
    [StringLength(100, ErrorMessage = "Tên đăng nhập hoặc email không được vượt quá 100 ký tự")]
    [RegularExpression(@"^[A-Za-z0-9._@+\-]+$", ErrorMessage = "Tên đăng nhập hoặc email chứa ký tự không hợp lệ")]
    string Username,
    [Required(ErrorMessage = "Mật khẩu không được để trống")]
    [StringLength(200, ErrorMessage = "Mật khẩu không hợp lệ")]
    string Password);

public record LoginResponseDto(
    int Userid,
    string Username,
    string Fullname,
    string? Email,
    int? Roleid,
    string Rolename,
    string AccessToken,
    int ExpiresIn,
    IReadOnlyList<int>? Roleids = null,
    IReadOnlyList<string>? Rolenames = null,
    IReadOnlyList<string>? Permissions = null);

public record MeResponseDto(
    int Userid,
    string Username,
    string Fullname,
    string? Email,
    int? Roleid,
    string Rolename,
    IReadOnlyList<int>? Roleids = null,
    IReadOnlyList<string>? Rolenames = null,
    IReadOnlyList<string>? Permissions = null);

public record ChangePasswordRequestDto(
    [Required] int Userid,
    [Required(ErrorMessage = "Mật khẩu cũ không được để trống")] string OldPassword,
    [Required(ErrorMessage = "Mật khẩu mới không được để trống")]
    [RegularExpression(@"^(?=.{8,}$)(?!.*\s)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).*$",
        ErrorMessage = "Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt")]
    string NewPassword);

public record RegisterRequestDto(
    [Required(ErrorMessage = "Tên đăng nhập không được để trống")]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "Tên đăng nhập từ 3-50 ký tự")]
    [RegularExpression(@"^[A-Za-z0-9._\-]+$", ErrorMessage = "Tên đăng nhập chỉ được gồm chữ, số, dấu chấm, gạch dưới và gạch ngang")]
    string Username,
    [Required(ErrorMessage = "Mật khẩu không được để trống")]
    [RegularExpression(@"^(?=.{8,}$)(?!.*\s)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).*$",
        ErrorMessage = "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt")]
    string Password,
    [Required(ErrorMessage = "Họ tên không được để trống")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Họ tên phải từ 2-100 ký tự")]
    [SafeText(ErrorMessage = "Họ tên chứa nội dung không an toàn")]
    string Fullname,
    [Required(ErrorMessage = "Email không được để trống")]
    [EmailAddress(ErrorMessage = "Email không hợp lệ")]
    [StringLength(100)]
    string Email,
    [Required(ErrorMessage = "Số điện thoại không được để trống")]
    [RegularExpression(@"^0\d{9}$", ErrorMessage = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0")]
    string Phone,
    [StringLength(6, MinimumLength = 6, ErrorMessage = "Mã xác nhận gồm 6 chữ số")]
    string? VerificationCode = null);

public record RegistrationOtpRequestDto(
    [Required(ErrorMessage = "Email không được để trống")]
    [EmailAddress(ErrorMessage = "Email không hợp lệ")]
    string Email);

public record ForgotPasswordRequestDto(
    [Required(ErrorMessage = "Email không được để trống")]
    [EmailAddress(ErrorMessage = "Email không hợp lệ")]
    string Email);

public record ResetPasswordRequestDto(
    [Required(ErrorMessage = "Email không được để trống")]
    [EmailAddress(ErrorMessage = "Email không hợp lệ")]
    string Email,
    [Required(ErrorMessage = "Mã xác nhận không được để trống")]
    [RegularExpression(@"^\d{6}$", ErrorMessage = "Mã xác nhận phải gồm 6 chữ số")]
    string VerificationCode,
    [Required(ErrorMessage = "Mật khẩu mới không được để trống")]
    [RegularExpression(@"^(?=.{8,}$)(?!.*\s)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).*$",
        ErrorMessage = "Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt")]
    string NewPassword,
    [Required(ErrorMessage = "Vui lòng xác nhận mật khẩu mới")]
    string ConfirmPassword);

public record TestEmailRequestDto(
    [Required(ErrorMessage = "Email không được để trống")]
    [EmailAddress(ErrorMessage = "Email không hợp lệ")]
    string Email);
