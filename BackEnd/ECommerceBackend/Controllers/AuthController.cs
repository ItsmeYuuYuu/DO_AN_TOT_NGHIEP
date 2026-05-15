using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ECommerceBackend.Models;

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

        // ── DTOs ──────────────────────────────────────────────────────────────
        public record LoginRequest(string Username, string Password);

        public record LoginResponse(
            int    Userid,
            string Username,
            string Fullname,
            string? Email,
            int?   Roleid,
            string Rolename,
            string AccessToken,
            int    ExpiresIn    // seconds
        );

        // ── POST /api/auth/login ──────────────────────────────────────────────
        /// <summary>
        /// Xác thực người dùng và trả về JWT Access Token.
        /// </summary>
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) ||
                string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { message = "Email và Mật khẩu không được để trống." });

            // Tìm user theo username (email) — must be active
            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u =>
                    u.Username == request.Username &&
                    u.Isactive == true);

            if (user == null)
                return Unauthorized(new { message = "Tài khoản không tồn tại hoặc đã bị vô hiệu hóa." });

            // BCrypt verify
            bool passwordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.Passwordhash);
            if (!passwordValid)
                return Unauthorized(new { message = "Mật khẩu không chính xác." });

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

            return Ok(new LoginResponse(
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

            return Ok(new
            {
                user.Userid,
                user.Username,
                user.Fullname,
                user.Email,
                user.Roleid,
                Rolename = user.Role?.Rolename ?? "Customer",
            });
        }

        // ── POST /api/auth/change-password ───────────────────────────────────
        [HttpPost("change-password")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest req)
        {
            var userIdClaim = User.FindFirst("userid")?.Value;
            if (userIdClaim == null || int.Parse(userIdClaim) != req.Userid)
                return Forbid();

            var user = await _context.Users.FindAsync(req.Userid);
            if (user == null) return NotFound();

            if (!BCrypt.Net.BCrypt.Verify(req.OldPassword, user.Passwordhash))
                return BadRequest(new { message = "Mật khẩu cũ không đúng." });

            user.Passwordhash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Đổi mật khẩu thành công." });
        }

        public record ChangePasswordRequest(int Userid, string OldPassword, string NewPassword);
    }
}
