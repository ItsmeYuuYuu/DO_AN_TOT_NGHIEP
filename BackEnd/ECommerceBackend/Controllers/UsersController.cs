using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Users;
using ECommerceBackend.DTOs.Common;
using System.Security.Claims;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
    public class UsersController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public UsersController(ECommerceContext context) => _context = context;

        private int? CurrentUserId
        {
            get
            {
                var value = User.FindFirstValue("userid")
                    ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
                return int.TryParse(value, out var userId) ? userId : null;
            }
        }

        private async Task<bool> RoleExistsAsync(int? roleId) =>
            roleId.HasValue && await _context.Roles.AnyAsync(role => role.Roleid == roleId.Value);

        private async Task<bool> IsAdminRoleAsync(int? roleId) =>
            roleId.HasValue && await _context.Roles
                .AnyAsync(role => role.Roleid == roleId.Value && role.Rolename == "Admin");

        private async Task<bool> IsLastActiveAdminAsync(User user)
        {
            if (user.Isactive != true || !await IsAdminRoleAsync(user.Roleid))
                return false;

            var activeAdminCount = await _context.Users.CountAsync(candidate =>
                candidate.Isactive == true &&
                candidate.Role != null &&
                candidate.Role.Rolename == "Admin");
            return activeAdminCount <= 1;
        }

        // GET: api/Users
        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserListItemDto>>> GetUsers()
        {
            var users = await _context.Users.Include(u => u.Role).ToListAsync();
            return Ok(users.Select(u => new UserListItemDto(
                u.Userid, u.Username, u.Fullname, u.Email, u.Phone, u.Roleid, u.Role?.Rolename, u.Isactive, u.Createdat
            )));
        }

        // GET: api/Users/5
        [HttpGet("{id}")]
        public async Task<ActionResult<UserListItemDto>> GetUser(int id)
        {
            var u = await _context.Users.Include(r => r.Role).FirstOrDefaultAsync(x => x.Userid == id);
            if (u == null) return NotFound();
            return Ok(new UserListItemDto(
                u.Userid, u.Username, u.Fullname, u.Email, u.Phone, u.Roleid, u.Role?.Rolename, u.Isactive, u.Createdat
            ));
        }

        // POST: api/Users
        [HttpPost]
        public async Task<ActionResult<UserListItemDto>> PostUser([FromBody] CreateUserRequestDto dto)
        {
            if (!await RoleExistsAsync(dto.Roleid))
                return BadRequest(new ApiErrorDto("Vai trò đã chọn không tồn tại.", null));

            var user = new User
            {
                Username = dto.Username,
                Passwordhash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Fullname = dto.Fullname,
                Email = dto.Email,
                Phone = dto.Phone,
                Roleid = dto.Roleid,
                Isactive = dto.Isactive ?? true,
                Createdat = DateTime.Now
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Load role
            await _context.Entry(user).Reference(u => u.Role).LoadAsync();

            var responseDto = new UserListItemDto(
                user.Userid, user.Username, user.Fullname, user.Email, user.Phone, user.Roleid, user.Role?.Rolename, user.Isactive, user.Createdat
            );

            return CreatedAtAction(nameof(GetUser), new { id = user.Userid }, responseDto);
        }

        // PUT: api/Users/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutUser(int id, [FromBody] UpdateUserRequestDto dto)
        {
            var user = await _context.Users
                .Include(item => item.Role)
                .FirstOrDefaultAsync(item => item.Userid == id);
            if (user == null) return NotFound();

            if (!await RoleExistsAsync(dto.Roleid))
                return BadRequest(new ApiErrorDto("Vai trò đã chọn không tồn tại.", null));

            var willRemainAdmin = await IsAdminRoleAsync(dto.Roleid);
            var willRemainActive = dto.Isactive ?? user.Isactive ?? true;
            var isCurrentUser = CurrentUserId == user.Userid;

            if (isCurrentUser && (!willRemainAdmin || !willRemainActive))
            {
                return Conflict(new ApiErrorDto(
                    "Bạn không thể tự hạ quyền hoặc vô hiệu hóa tài khoản Admin đang đăng nhập.",
                    null));
            }

            if ((!willRemainAdmin || !willRemainActive) && await IsLastActiveAdminAsync(user))
            {
                return Conflict(new ApiErrorDto(
                    "Không thể thay đổi vì đây là tài khoản Admin hoạt động cuối cùng.",
                    null));
            }

            user.Fullname = dto.Fullname;
            user.Email = dto.Email;
            user.Phone = dto.Phone;
            user.Roleid = dto.Roleid;
            
            if (dto.Isactive.HasValue)
                user.Isactive = dto.Isactive.Value;

            if (!string.IsNullOrWhiteSpace(dto.NewPassword))
                user.Passwordhash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);

            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Users.Any(e => e.Userid == id)) return NotFound();
                throw;
            }

            // Load role
            await _context.Entry(user).Reference(u => u.Role).LoadAsync();

            var responseDto = new UserListItemDto(
                user.Userid, user.Username, user.Fullname, user.Email, user.Phone, user.Roleid, user.Role?.Rolename, user.Isactive, user.Createdat
            );

            return Ok(responseDto);
        }

        // DELETE: api/Users/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users
                .Include(item => item.Role)
                .FirstOrDefaultAsync(item => item.Userid == id);
            if (user == null) return NotFound();

            if (user.Role?.Rolename == "Customer")
            {
                return Conflict(new ApiErrorDto(
                    "Tài khoản khách hàng không nên xóa hẳn. Hãy vô hiệu hóa tài khoản để giữ lại hồ sơ, đơn hàng và lịch sử bảo hành.",
                    null));
            }

            if (CurrentUserId == user.Userid)
                return Conflict(new ApiErrorDto("Bạn không thể tự xóa tài khoản đang đăng nhập.", null));

            if (await IsLastActiveAdminAsync(user))
            {
                return Conflict(new ApiErrorDto(
                    "Không thể xóa tài khoản Admin hoạt động cuối cùng.",
                    null));
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // PATCH: api/Users/5/toggle-active
        [HttpPatch("{id}/toggle-active")]
        public async Task<IActionResult> ToggleActive(int id)
        {
            var user = await _context.Users
                .Include(item => item.Role)
                .FirstOrDefaultAsync(item => item.Userid == id);
            if (user == null) return NotFound();

            if (user.Isactive == true && CurrentUserId == user.Userid)
            {
                return Conflict(new ApiErrorDto(
                    "Bạn không thể tự vô hiệu hóa tài khoản đang đăng nhập.",
                    null));
            }

            if (user.Isactive == true && await IsLastActiveAdminAsync(user))
            {
                return Conflict(new ApiErrorDto(
                    "Không thể vô hiệu hóa tài khoản Admin hoạt động cuối cùng.",
                    null));
            }

            user.Isactive = !user.Isactive;
            await _context.SaveChangesAsync();
            return Ok(new ToggleUserActiveResponseDto(user.Userid, user.Isactive));
        }
    }
}
