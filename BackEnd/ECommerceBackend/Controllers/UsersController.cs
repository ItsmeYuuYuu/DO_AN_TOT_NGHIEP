using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Users;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
    public class UsersController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public UsersController(ECommerceContext context) => _context = context;

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
            var user = new User
            {
                Username = dto.Username,
                Passwordhash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Fullname = dto.Fullname,
                Email = dto.Email,
                Phone = dto.Phone,
                Roleid = dto.Roleid,
                Isactive = dto.Isactive ?? true,
                Createdat = DateTime.UtcNow
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
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();

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
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();
            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // PATCH: api/Users/5/toggle-active
        [HttpPatch("{id}/toggle-active")]
        public async Task<IActionResult> ToggleActive(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();
            user.Isactive = !user.Isactive;
            await _context.SaveChangesAsync();
            return Ok(new ToggleUserActiveResponseDto(user.Userid, user.Isactive));
        }
    }
}
