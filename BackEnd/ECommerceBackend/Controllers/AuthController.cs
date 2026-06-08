using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Auth;
using ECommerceBackend.DTOs.Common;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly ECommerceContext _context;
        private readonly IConfiguration _config;

        public AuthController(ECommerceContext context, IConfiguration config)
        {
            _context = context;
            _config  = config;
        }

        // ── POST /api/auth/login ──────────────────────────────────────────────
        /// <summary>
        /// Xác thực người dùng và trả về JWT Access Token.
        /// </summary>
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) ||
                string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new ApiErrorDto("Email và Mật khẩu không được để trống."));

            var identifier = request.Username.Trim().ToLowerInvariant();

            // Cho phép đăng nhập bằng tên đăng nhập hoặc email.
            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u =>
                    (u.Username.ToLower() == identifier ||
                     (u.Email != null && u.Email.ToLower() == identifier)) &&
                    u.Isactive == true);

            if (user == null)
                return Unauthorized(new ApiErrorDto("Tài khoản không tồn tại hoặc đã bị vô hiệu hóa."));

            // BCrypt verify
            bool passwordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.Passwordhash);
            if (!passwordValid)
                return Unauthorized(new ApiErrorDto("Mật khẩu không chính xác."));

            // ── Build JWT ─────────────────────────────────────────────────────
            var jwt          = _config.GetSection("JwtSettings");
            var secretKey    = jwt["SecretKey"]!;
            var issuer       = jwt["Issuer"]!;
            var audience     = jwt["Audience"]!;
            var expiryMins   = int.Parse(jwt["ExpiryMinutes"] ?? "480");

            var roleName = user.Role?.Rolename ?? "Customer";

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub,   user.Userid.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email ?? user.Username),
                new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
                new Claim("userid",   user.Userid.ToString()),
                new Claim("username", user.Username),
                new Claim("fullname", user.Fullname),
                new Claim(ClaimTypes.Role, roleName),
            };

            var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var creds      = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);
            var expiry     = DateTime.UtcNow.AddMinutes(expiryMins);

            var token = new JwtSecurityToken(
                issuer:             issuer,
                audience:           audience,
                claims:             claims,
                expires:            expiry,
                signingCredentials: creds
            );

            var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

            return Ok(new LoginResponseDto(
                Userid:      user.Userid,
                Username:    user.Username,
                Fullname:    user.Fullname,
                Email:       user.Email,
                Roleid:      user.Roleid,
                Rolename:    roleName,
                AccessToken: tokenString,
                ExpiresIn:   expiryMins * 60
            ));
        }

        // ── POST /api/auth/logout ─────────────────────────────────────────────
        /// <summary>
        /// Dummy endpoint cho thao tác đăng xuất, hiện tại chỉ trả về 200 OK.
        /// </summary>
        [HttpPost("logout")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public IActionResult Logout()
        {
            return Ok(new ApiMessageDto("Đăng xuất thành công."));
        }

        // ── GET /api/auth/me ──────────────────────────────────────────────────
        /// <summary>
        /// Trả về thông tin người dùng đang đăng nhập từ JWT claims.
        /// [Authorize] — yêu cầu Bearer token hợp lệ.
        /// </summary>
        [HttpGet("me")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<IActionResult> Me()
        {
            var userIdClaim = User.FindFirst("userid")?.Value;
            if (userIdClaim == null) return Unauthorized();

            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Userid == int.Parse(userIdClaim));

            if (user == null) return NotFound();

            return Ok(new MeResponseDto(
                Userid: user.Userid,
                Username: user.Username,
                Fullname: user.Fullname,
                Email: user.Email,
                Roleid: user.Roleid,
                Rolename: user.Role?.Rolename ?? "Customer"
            ));
        }

        [HttpPost("change-password")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequestDto req)
        {
            var userIdClaim = User.FindFirst("userid")?.Value;
            if (userIdClaim == null || int.Parse(userIdClaim) != req.Userid)
                return Forbid();

            var user = await _context.Users.FindAsync(req.Userid);
            if (user == null) return NotFound();

            if (!BCrypt.Net.BCrypt.Verify(req.OldPassword, user.Passwordhash))
                return BadRequest(new ApiErrorDto("Mật khẩu cũ không đúng."));

            user.Passwordhash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
            await _context.SaveChangesAsync();
            return Ok(new ApiMessageDto("Đổi mật khẩu thành công."));
        }

        // ── POST /api/auth/register ───────────────────────────────────────────
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDto req)
        {
            var username = req.Username.Trim();
            var fullname = req.Fullname.Trim();
            var email = req.Email.Trim().ToLowerInvariant();
            var phone = req.Phone.Trim();

            if (await _context.Users.AnyAsync(user =>
                    user.Username.ToLower() == username.ToLower()))
            {
                return Conflict(new ApiErrorDto("Tên đăng nhập đã tồn tại.", null));
            }

            if (await _context.Users.AnyAsync(user =>
                    user.Email != null && user.Email.ToLower() == email))
            {
                return Conflict(new ApiErrorDto("Email đã được sử dụng cho tài khoản khác.", null));
            }

            if (await _context.Users.AnyAsync(user => user.Phone == phone))
            {
                return Conflict(new ApiErrorDto("Số điện thoại đã được sử dụng cho tài khoản khác.", null));
            }

            var customerRole = await _context.Roles.FirstOrDefaultAsync(r => r.Rolename == "Customer");
            if (customerRole == null)
                return StatusCode(500, new ApiErrorDto("Hệ thống chưa cấu hình role Customer. Vui lòng liên hệ Admin.", null));

            await using var transaction = await _context.Database.BeginTransactionAsync();
            var user = new User
            {
                Username     = username,
                Passwordhash = BCrypt.Net.BCrypt.HashPassword(req.Password),
                Fullname     = fullname,
                Email        = email,
                Phone        = phone,
                Roleid       = customerRole.Roleid,
                Isactive     = true,
                Createdat    = DateTime.Now
            };

            try
            {
                _context.Users.Add(user);

                var customer = await _context.Customers.FirstOrDefaultAsync(item =>
                    item.Email == email || item.Phone == phone);
                if (customer == null)
                {
                    _context.Customers.Add(new Customer
                    {
                        Fullname = fullname,
                        Email = email,
                        Phone = phone,
                        Createdat = DateTime.Now
                    });
                }
                else
                {
                    customer.Fullname = fullname;
                    customer.Email ??= email;
                    customer.Phone = phone;
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return Ok(new ApiMessageDto("Đăng ký thành công. Bạn có thể đăng nhập ngay."));
            }
            catch (DbUpdateException)
            {
                await transaction.RollbackAsync();
                return Conflict(new ApiErrorDto(
                    "Tên đăng nhập, email hoặc số điện thoại đã được sử dụng.",
                    null));
            }
        }

        // ── POST /api/auth/forgot-password ────────────────────────────────────
        // Stub: không gửi email thật ở P4. Luôn trả 200 để không lộ thông tin user.
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDto req)
        {
            // Intentional: do not reveal whether the email exists (security)
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == req.Email);
            if (user != null)
            {
                // TODO P5: integrate email service (SMTP/SendGrid) to send reset link
                Console.WriteLine($"[ForgotPassword-Stub] User {user.Username} requested password reset.");
            }
            return Ok(new ApiMessageDto("Nếu email này tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu."));
        }
    }
}
