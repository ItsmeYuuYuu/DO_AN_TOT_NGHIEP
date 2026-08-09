using System.IdentityModel.Tokens.Jwt;
using System.Net.Mail;
using System.Security.Claims;
using System.Text;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.RateLimiting;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Auth;
using ECommerceBackend.DTOs.Common;
using ECommerceBackend.Services.Auth;
using ECommerceBackend.Services.Email;
using ECommerceBackend.Authorization;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly ECommerceContext _context;
        private readonly IConfiguration _config;
        private readonly IRegistrationOtpService _registrationOtpService;
        private readonly IPasswordResetService _passwordResetService;
        private readonly IEmailService _emailService;
        private readonly IStaffSessionService _staffSessionService;
        private readonly ILogger<AuthController> _logger;
        private const string RefreshCookieName = "ec_refresh_token";

        public AuthController(
            ECommerceContext context,
            IConfiguration config,
            IRegistrationOtpService registrationOtpService,
            IPasswordResetService passwordResetService,
            IEmailService emailService,
            IStaffSessionService staffSessionService,
            ILogger<AuthController> logger)
        {
            _context = context;
            _config  = config;
            _registrationOtpService = registrationOtpService;
            _passwordResetService = passwordResetService;
            _emailService = emailService;
            _staffSessionService = staffSessionService;
            _logger = logger;
        }

        private async Task<(List<int> Roleids, List<string> Rolenames, List<string> Permissions)> GetAccessAsync(User user)
        {
            var assignedRoles = await _context.Userroles
                .AsNoTracking()
                .Where(item => item.Userid == user.Userid)
                .Select(item => new { item.Roleid, item.Role.Rolename })
                .ToListAsync();

            if (user.Roleid.HasValue && user.Role != null && assignedRoles.All(item => item.Roleid != user.Roleid.Value))
            {
                assignedRoles.Add(new { Roleid = user.Roleid.Value, user.Role.Rolename });
            }

            var roleids = assignedRoles.Select(item => item.Roleid).Distinct().ToList();
            var rolenames = assignedRoles.Select(item => item.Rolename).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
            var permissions = rolenames.Contains("Admin", StringComparer.OrdinalIgnoreCase)
                ? new List<string> { AppPermissions.Wildcard }
                : await _context.Rolepermissions
                    .AsNoTracking()
                    .Where(item => roleids.Contains(item.Roleid))
                    .Select(item => item.Permission.Code)
                    .Distinct()
                    .OrderBy(code => code)
                    .ToListAsync();

            return (roleids, rolenames, permissions);
        }

        private static string HashRefreshToken(string token) =>
            Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token))).ToLowerInvariant();

        private void StoreRefreshToken(User user, string sessionId)
        {
            var rawToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
            var lifetimeDays = int.Parse(_config["JwtSettings:RefreshTokenDays"] ?? "14");
            _context.Refreshtokens.Add(new Refreshtoken
            {
                Refreshtokenid = Guid.NewGuid(), Userid = user.Userid,
                Tokenhash = HashRefreshToken(rawToken), Sessionid = sessionId,
                Createdat = DateTime.UtcNow, Expiresat = DateTime.UtcNow.AddDays(lifetimeDays)
            });
            Response.Cookies.Append(RefreshCookieName, rawToken, RefreshCookieOptions(DateTimeOffset.UtcNow.AddDays(lifetimeDays)));
        }

        private CookieOptions RefreshCookieOptions(DateTimeOffset? expires = null) => new()
        {
            HttpOnly = true,
            Secure = !HttpContext.RequestServices.GetRequiredService<IWebHostEnvironment>().IsDevelopment(),
            SameSite = SameSiteMode.Lax,
            Expires = expires,
            Path = "/api/auth"
        };

        private async Task<LoginResponseDto> IssueAccessTokenAsync(User user, string sessionId)
        {
            var jwt = _config.GetSection("JwtSettings");
            var expiryMins = int.Parse(jwt["ExpiryMinutes"] ?? "15");
            var roleName = user.Role?.Rolename ?? "Customer";
            var access = await GetAccessAsync(user);
            if (access.Rolenames.Count == 0)
            {
                access.Rolenames.Add(roleName);
                if (user.Roleid.HasValue) access.Roleids.Add(user.Roleid.Value);
            }
            var isStaff = access.Rolenames.Any(name => !string.Equals(name, "Customer", StringComparison.OrdinalIgnoreCase));
            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.Sub, user.Userid.ToString()),
                new(JwtRegisteredClaimNames.Email, user.Email ?? user.Username),
                new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
                new("userid", user.Userid.ToString()), new("username", user.Username),
                new("fullname", user.Fullname), new("sessionid", sessionId),
            };
            claims.AddRange(access.Rolenames.Select(name => new Claim(ClaimTypes.Role, name)));
            claims.AddRange(access.Permissions.Select(permission => new Claim(AppPermissions.ClaimType, permission)));
            if (isStaff) claims.Add(new Claim("staff", "true"));
            var credentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["SecretKey"]!)), SecurityAlgorithms.HmacSha256);
            var token = new JwtSecurityToken(jwt["Issuer"], jwt["Audience"], claims,
                expires: DateTime.UtcNow.AddMinutes(expiryMins), signingCredentials: credentials);
            if (isStaff)
            {
                var refreshDays = int.Parse(jwt["RefreshTokenDays"] ?? "14");
                await _staffSessionService.ActivateAsync(user.Userid, sessionId,
                    TimeSpan.FromDays(refreshDays), HttpContext.RequestAborted);
            }
            return new LoginResponseDto(user.Userid, user.Username, user.Fullname, user.Email,
                user.Roleid, roleName, new JwtSecurityTokenHandler().WriteToken(token), expiryMins * 60,
                access.Roleids, access.Rolenames, access.Permissions);
        }

        private Task RevokeAllRefreshTokensAsync(int userId) => _context.Refreshtokens
            .Where(token => token.Userid == userId && token.Revokedat == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(token => token.Revokedat, DateTime.UtcNow));

        // ── POST /api/auth/login ──────────────────────────────────────────────
        /// <summary>
        /// Xác thực người dùng và trả về JWT Access Token.
        /// </summary>
        [HttpPost("login")]
        [EnableRateLimiting("LoginRequests")]
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

            var sessionId = Guid.NewGuid().ToString("N");
            var response = await IssueAccessTokenAsync(user, sessionId);
            StoreRefreshToken(user, sessionId);
            await _context.SaveChangesAsync(HttpContext.RequestAborted);
            return Ok(response);
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh()
        {
            if (!Request.Cookies.TryGetValue(RefreshCookieName, out var rawToken) || string.IsNullOrWhiteSpace(rawToken))
                return Unauthorized(new ApiErrorDto("Phiên đăng nhập đã hết hạn."));

            var tokenHash = HashRefreshToken(rawToken);
            var storedToken = await _context.Refreshtokens
                .Include(token => token.User).ThenInclude(user => user.Role)
                .SingleOrDefaultAsync(token => token.Tokenhash == tokenHash);
            if (storedToken == null || storedToken.Revokedat != null ||
                storedToken.Expiresat <= DateTime.UtcNow || storedToken.User.Isactive != true)
            {
                Response.Cookies.Delete(RefreshCookieName, RefreshCookieOptions());
                return Unauthorized(new ApiErrorDto("Phiên đăng nhập đã hết hạn."));
            }

            var currentAccess = await GetAccessAsync(storedToken.User);
            var isStaff = currentAccess.Rolenames.Any(name =>
                !string.Equals(name, "Customer", StringComparison.OrdinalIgnoreCase));
            if (isStaff && !await _staffSessionService.IsActiveAsync(
                    storedToken.Userid, storedToken.Sessionid, HttpContext.RequestAborted))
            {
                await _context.Refreshtokens
                    .Where(token => token.Refreshtokenid == storedToken.Refreshtokenid && token.Revokedat == null)
                    .ExecuteUpdateAsync(setters => setters.SetProperty(token => token.Revokedat, DateTime.UtcNow));
                Response.Cookies.Delete(RefreshCookieName, RefreshCookieOptions());
                return Unauthorized(new
                {
                    message = "Phiên đăng nhập đã được mở trên thiết bị khác. Vui lòng đăng nhập lại.",
                    code = "STAFF_SESSION_REPLACED"
                });
            }

            var rotated = await _context.Refreshtokens
                .Where(token => token.Refreshtokenid == storedToken.Refreshtokenid && token.Revokedat == null)
                .ExecuteUpdateAsync(setters => setters.SetProperty(token => token.Revokedat, DateTime.UtcNow));
            if (rotated != 1)
                return Unauthorized(new ApiErrorDto("Phiên đăng nhập đã được làm mới ở yêu cầu khác."));
            var response = await IssueAccessTokenAsync(storedToken.User, storedToken.Sessionid);
            StoreRefreshToken(storedToken.User, storedToken.Sessionid);
            await _context.SaveChangesAsync(HttpContext.RequestAborted);
            return Ok(response);
        }

        // ── POST /api/auth/logout ─────────────────────────────────────────────
        /// <summary>
        /// Dummy endpoint cho thao tác đăng xuất, hiện tại chỉ trả về 200 OK.
        /// </summary>
        [HttpPost("logout")]
        [AllowAnonymous]
        public async Task<IActionResult> Logout()
        {
            var userIdValue = User.FindFirst("userid")?.Value;
            var sessionId = User.FindFirst("sessionid")?.Value;
            var isStaff = string.Equals(User.FindFirst("staff")?.Value, "true", StringComparison.OrdinalIgnoreCase);

            if (isStaff &&
                int.TryParse(userIdValue, out var userId) &&
                !string.IsNullOrWhiteSpace(sessionId))
            {
                await _staffSessionService.RevokeAsync(
                    userId,
                    sessionId,
                    HttpContext.RequestAborted);
            }

            if (Request.Cookies.TryGetValue(RefreshCookieName, out var rawToken) && !string.IsNullOrWhiteSpace(rawToken))
            {
                var hash = HashRefreshToken(rawToken);
                var refreshToken = await _context.Refreshtokens.SingleOrDefaultAsync(token => token.Tokenhash == hash);
                if (refreshToken != null && refreshToken.Revokedat == null)
                {
                    refreshToken.Revokedat = DateTime.UtcNow;
                    await _staffSessionService.RevokeAsync(
                        refreshToken.Userid,
                        refreshToken.Sessionid,
                        HttpContext.RequestAborted);
                    await _context.SaveChangesAsync(HttpContext.RequestAborted);
                }
            }
            Response.Cookies.Delete(RefreshCookieName, RefreshCookieOptions());

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

            var access = await GetAccessAsync(user);
            return Ok(new MeResponseDto(
                Userid: user.Userid,
                Username: user.Username,
                Fullname: user.Fullname,
                Email: user.Email,
                Roleid: user.Roleid,
                Rolename: user.Role?.Rolename ?? "Customer",
                Roleids: access.Roleids,
                Rolenames: access.Rolenames,
                Permissions: access.Permissions
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
            await RevokeAllRefreshTokensAsync(user.Userid);
            await _context.SaveChangesAsync();
            return Ok(new ApiMessageDto("Đổi mật khẩu thành công."));
        }

        [HttpPost("registration-code")]
        [EnableRateLimiting("RegistrationOtpRequests")]
        public async Task<IActionResult> RequestRegistrationCode([FromBody] RegistrationOtpRequestDto req)
        {
            var email = req.Email.Trim().ToLowerInvariant();
            if (await _context.Users.AnyAsync(user =>
                    user.Email != null && user.Email.ToLower() == email))
            {
                return Conflict(new ApiErrorDto("Email đã được sử dụng cho tài khoản khác.", null));
            }

            try
            {
                await _registrationOtpService.SendCodeAsync(email, HttpContext.RequestAborted);
            }
            catch (SmtpException)
            {
                return StatusCode(502, new ApiErrorDto(
                    "Không gửi được mã xác nhận qua email. Vui lòng kiểm tra cấu hình Gmail SMTP hoặc App Password.",
                    null));
            }
            catch (InvalidOperationException)
            {
                return StatusCode(502, new ApiErrorDto(
                    "Không gửi được mã xác nhận qua email. Vui lòng kiểm tra cấu hình Gmail SMTP hoặc App Password.",
                    null));
            }

            return Ok(new ApiMessageDto(
                _emailService.IsConfigured
                    ? "Mã xác nhận đã được gửi đến email của bạn."
                    : "Mã xác nhận đã được tạo. Do chưa cấu hình SMTP, vui lòng xem console backend để lấy mã demo."));
        }

        [HttpPost("email-test")]
        [HasPermission(AppPermissions.EmailTest)]
        public async Task<IActionResult> SendTestEmail([FromBody] TestEmailRequestDto req)
        {
            if (!_emailService.IsConfigured)
            {
                return BadRequest(new ApiErrorDto(
                    "SMTP chưa được cấu hình. Vui lòng cấu hình Email:Enabled, Username và Password trước khi gửi thử.",
                    null));
            }

            await _emailService.SendTestEmailAsync(
                req.Email.Trim().ToLowerInvariant(),
                HttpContext.RequestAborted);

            return Ok(new ApiMessageDto("Email kiểm thử đã được gửi. Vui lòng kiểm tra hộp thư đến hoặc mục spam."));
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

            if (_emailService.RequireRegistrationOtp &&
                !await _registrationOtpService.ValidateAsync(email, req.VerificationCode, HttpContext.RequestAborted))
            {
                return BadRequest(new ApiErrorDto("Mã xác nhận email không đúng hoặc đã hết hạn.", null));
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
                Createdat    = DateTime.UtcNow
            };

            try
            {
                _context.Users.Add(user);
                _context.Userroles.Add(new Userrole { User = user, Roleid = customerRole.Roleid });

                var customer = await _context.Customers.FirstOrDefaultAsync(item =>
                    item.Email == email || item.Phone == phone);
                if (customer == null)
                {
                    _context.Customers.Add(new Customer
                    {
                        Fullname = fullname,
                        Email = email,
                        Phone = phone,
                        Createdat = DateTime.UtcNow
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
        [HttpPost("forgot-password")]
        [EnableRateLimiting("PasswordResetRequests")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDto req)
        {
            var email = req.Email.Trim().ToLowerInvariant();
            var user = await _context.Users.FirstOrDefaultAsync(user =>
                user.Email != null && user.Email.ToLower() == email && user.Isactive == true);
            if (user != null)
            {
                try
                {
                    await _passwordResetService.SendCodeAsync(email, HttpContext.RequestAborted);
                }
                catch (Exception exception) when (exception is SmtpException or InvalidOperationException)
                {
                    _logger.LogError(exception, "Could not send password reset OTP to {Email}", email);
                }
            }

            var message = _emailService.IsConfigured
                ? "Nếu email tồn tại trong hệ thống, mã khôi phục sẽ được gửi đến hộp thư của bạn."
                : "Nếu email tồn tại trong hệ thống, mã khôi phục đã được tạo. Do SMTP chưa cấu hình, vui lòng xem console backend để lấy mã demo.";
            return Ok(new ApiMessageDto(message));
        }

        // ── POST /api/auth/reset-password ─────────────────────────────────────
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequestDto req)
        {
            if (!string.Equals(req.NewPassword, req.ConfirmPassword, StringComparison.Ordinal))
                return BadRequest(new ApiErrorDto("Mật khẩu xác nhận không khớp.", null));

            var email = req.Email.Trim().ToLowerInvariant();
            var user = await _context.Users.FirstOrDefaultAsync(user =>
                user.Email != null && user.Email.ToLower() == email && user.Isactive == true);

            if (user == null)
                return BadRequest(new ApiErrorDto("Mã khôi phục không đúng hoặc đã hết hạn.", null));

            if (BCrypt.Net.BCrypt.Verify(req.NewPassword, user.Passwordhash))
                return BadRequest(new ApiErrorDto("Mật khẩu mới phải khác mật khẩu hiện tại.", null));

            var isValid = await _passwordResetService.ValidateAndConsumeAsync(
                email,
                req.VerificationCode,
                HttpContext.RequestAborted);
            if (!isValid)
                return BadRequest(new ApiErrorDto("Mã khôi phục không đúng, đã hết hạn hoặc đã vượt quá số lần thử.", null));

            user.Passwordhash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
            await RevokeAllRefreshTokensAsync(user.Userid);
            await _context.SaveChangesAsync(HttpContext.RequestAborted);

            return Ok(new ApiMessageDto("Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới."));
        }
    }
}
