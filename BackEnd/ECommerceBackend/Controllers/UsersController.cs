using System.Security.Claims;
using ECommerceBackend.Authorization;
using ECommerceBackend.DTOs.Common;
using ECommerceBackend.DTOs.Users;
using ECommerceBackend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ECommerceBackend.Controllers;

[Route("api/[controller]")]
[ApiController]
[HasPermission(AppPermissions.UsersManage)]
public class UsersController : ControllerBase
{
    private readonly ECommerceContext _context;
    public UsersController(ECommerceContext context) => _context = context;

    private int? CurrentUserId
    {
        get
        {
            var value = User.FindFirstValue("userid") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(value, out var userId) ? userId : null;
        }
    }

    private async Task<List<Role>> ResolveStaffRolesAsync(int? legacyRoleid, IReadOnlyList<int>? roleids)
    {
        var ids = (roleids ?? Array.Empty<int>()).ToHashSet();
        if (legacyRoleid.HasValue) ids.Add(legacyRoleid.Value);
        if (ids.Count == 0) return new List<Role>();
        return await _context.Roles
            .Where(role => ids.Contains(role.Roleid) && role.Rolename != "Customer")
            .OrderBy(role => role.Roleid)
            .ToListAsync();
    }

    private async Task<IReadOnlyList<UserListItemDto>> MapAsync(IReadOnlyList<User> users)
    {
        if (users.Count == 0) return Array.Empty<UserListItemDto>();

        var userIds = users.Select(item => item.Userid).ToList();
        var assignments = await _context.Userroles.AsNoTracking()
            .Where(item => userIds.Contains(item.Userid))
            .Select(item => new { item.Userid, item.Roleid, item.Role.Rolename })
            .ToListAsync();
        var roleIds = assignments.Select(item => item.Roleid)
            .Concat(users.Where(item => item.Roleid.HasValue).Select(item => item.Roleid!.Value))
            .Distinct()
            .ToList();
        var permissionAssignments = await _context.Rolepermissions.AsNoTracking()
            .Where(item => roleIds.Contains(item.Roleid))
            .Select(item => new { item.Roleid, item.Permission.Code })
            .ToListAsync();

        return users.Select(user =>
        {
            var roles = assignments
                .Where(item => item.Userid == user.Userid)
                .Select(item => new { item.Roleid, item.Rolename })
                .ToList();
            if (user.Roleid.HasValue && user.Role != null && roles.All(item => item.Roleid != user.Roleid.Value))
                roles.Add(new { Roleid = user.Roleid.Value, user.Role.Rolename });

            var effectiveRoleIds = roles.Select(item => item.Roleid).Distinct().ToList();
            var roleNames = roles.Select(item => item.Rolename).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
            var permissions = roleNames.Contains("Admin", StringComparer.OrdinalIgnoreCase)
                ? new List<string> { AppPermissions.Wildcard }
                : permissionAssignments
                    .Where(item => effectiveRoleIds.Contains(item.Roleid))
                    .Select(item => item.Code)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(code => code)
                    .ToList();

            return new UserListItemDto(user.Userid, user.Username, user.Fullname, user.Email, user.Phone,
                user.Roleid, user.Role?.Rolename, user.Isactive, user.Createdat,
                effectiveRoleIds, roleNames, permissions, user.Createdbyuserid, user.Createdbyuser?.Fullname);
        }).ToList();
    }

    private async Task ReplaceRolesAsync(User user, IReadOnlyList<Role> roles)
    {
        await _context.Userroles.Where(item => item.Userid == user.Userid).ExecuteDeleteAsync();
        _context.Userroles.AddRange(roles.Select(role => new Userrole { Userid = user.Userid, Roleid = role.Roleid }));
        user.Roleid = roles.FirstOrDefault()?.Roleid;
    }

    private async Task<bool> IsLastActiveAdminAsync(User user, IReadOnlyList<Role>? replacementRoles = null)
    {
        if (user.Isactive != true) return false;
        var currentlyAdmin = await _context.Userroles.AnyAsync(item => item.Userid == user.Userid && item.Role.Rolename == "Admin") ||
            (user.Role != null && user.Role.Rolename == "Admin");
        if (!currentlyAdmin) return false;
        if (replacementRoles?.Any(role => role.Rolename == "Admin") == true) return false;

        var activeAdminIds = await _context.Users
            .Where(item => item.Isactive == true &&
                (item.Role!.Rolename == "Admin" || item.Userroles.Any(assignment => assignment.Role.Rolename == "Admin")))
            .Select(item => item.Userid).Distinct().ToListAsync();
        return activeAdminIds.Count <= 1;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResultDto<UserListItemDto>>> GetUsers(
        [FromQuery] string? query = null,
        [FromQuery] int? roleId = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 5, 100);

        var staffQuery = _context.Users.AsNoTracking().Include(item => item.Role).Include(item => item.Createdbyuser)
            .Where(item => item.Role == null || item.Role.Rolename != "Customer")
            .Where(item => !item.Userroles.Any(role => role.Role.Rolename == "Customer"))
            .AsQueryable();

        var keyword = query?.Trim().ToLowerInvariant();
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            staffQuery = staffQuery.Where(user =>
                user.Username.ToLower().Contains(keyword) ||
                user.Fullname.ToLower().Contains(keyword) ||
                (user.Email != null && user.Email.ToLower().Contains(keyword)) ||
                (user.Phone != null && user.Phone.Contains(keyword)) ||
                (user.Role != null && user.Role.Rolename.ToLower().Contains(keyword)) ||
                user.Userroles.Any(assignment => assignment.Role.Rolename.ToLower().Contains(keyword)));
        }

        if (roleId.HasValue)
            staffQuery = staffQuery.Where(user => user.Roleid == roleId.Value ||
                user.Userroles.Any(assignment => assignment.Roleid == roleId.Value));

        if (isActive.HasValue)
            staffQuery = staffQuery.Where(user => user.Isactive == isActive.Value);

        var totalCount = await staffQuery.CountAsync();
        var users = await staffQuery
            .OrderByDescending(item => item.Createdat)
            .ThenByDescending(item => item.Userid)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PagedResultDto<UserListItemDto>
        {
            Items = await MapAsync(users),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        });
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<UserListItemDto>> GetUser(int id)
    {
        var user = await _context.Users.AsNoTracking().Include(item => item.Role).FirstOrDefaultAsync(item => item.Userid == id);
        if (user == null || user.Role?.Rolename == "Customer") return NotFound();
        if (await _context.Userroles.AnyAsync(item => item.Userid == id && item.Role.Rolename == "Customer"))
            return NotFound();
        return Ok((await MapAsync(new[] { user })).Single());
    }

    [HttpPost]
    public async Task<ActionResult<UserListItemDto>> PostUser([FromBody] CreateUserRequestDto dto)
    {
        var roles = await ResolveStaffRolesAsync(dto.Roleid, dto.Roleids);
        var requestedCount = (dto.Roleids ?? Array.Empty<int>()).Append(dto.Roleid ?? 0).Where(id => id > 0).Distinct().Count();
        if (roles.Count == 0 || roles.Count != requestedCount)
            return BadRequest(new ApiErrorDto("Phải chọn ít nhất một vai trò nhân viên hợp lệ; không thể tạo Customer tại đây.", null));

        var username = dto.Username.Trim();
        if (await _context.Users.AnyAsync(item => item.Username.ToLower() == username.ToLower()))
            return Conflict(new ApiErrorDto("Tên đăng nhập đã tồn tại.", null));

        var user = new User
        {
            Username = username,
            Passwordhash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Fullname = dto.Fullname.Trim(),
            Email = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email.Trim().ToLowerInvariant(),
            Phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim(),
            Roleid = roles[0].Roleid,
            Isactive = dto.Isactive ?? true,
            Createdat = DateTime.UtcNow
            ,Createdbyuserid = CurrentUserId
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        await ReplaceRolesAsync(user, roles);
        await _context.SaveChangesAsync();
        await _context.Entry(user).Reference(item => item.Role).LoadAsync();
        return CreatedAtAction(nameof(GetUser), new { id = user.Userid }, (await MapAsync(new[] { user })).Single());
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<UserListItemDto>> PutUser(int id, [FromBody] UpdateUserRequestDto dto)
    {
        var user = await _context.Users.Include(item => item.Role).FirstOrDefaultAsync(item => item.Userid == id);
        if (user == null || user.Role?.Rolename == "Customer") return NotFound();
        var roles = await ResolveStaffRolesAsync(dto.Roleid, dto.Roleids);
        var requestedCount = (dto.Roleids ?? Array.Empty<int>()).Append(dto.Roleid ?? 0).Where(roleId => roleId > 0).Distinct().Count();
        if (roles.Count == 0 || roles.Count != requestedCount)
            return BadRequest(new ApiErrorDto("Phải chọn ít nhất một vai trò nhân viên hợp lệ.", null));

        var remainsAdmin = roles.Any(role => role.Rolename == "Admin");
        var remainsActive = dto.Isactive ?? user.Isactive ?? true;
        if (CurrentUserId == id && (!remainsAdmin || !remainsActive))
            return Conflict(new ApiErrorDto("Bạn không thể tự gỡ quyền Admin hoặc vô hiệu hóa tài khoản đang đăng nhập.", null));
        if ((!remainsAdmin || !remainsActive) && await IsLastActiveAdminAsync(user, roles))
            return Conflict(new ApiErrorDto("Không thể thay đổi Admin hoạt động cuối cùng.", null));

        user.Fullname = dto.Fullname.Trim();
        user.Email = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email.Trim().ToLowerInvariant();
        user.Phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim();
        if (dto.Isactive.HasValue) user.Isactive = dto.Isactive.Value;
        if (!string.IsNullOrWhiteSpace(dto.NewPassword)) user.Passwordhash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        await ReplaceRolesAsync(user, roles);
        await _context.SaveChangesAsync();
        await _context.Entry(user).Reference(item => item.Role).LoadAsync();
        return Ok((await MapAsync(new[] { user })).Single());
    }

    [HttpPatch("{id:int}/toggle-active")]
    public async Task<IActionResult> ToggleActive(int id)
    {
        var user = await _context.Users.Include(item => item.Role).FirstOrDefaultAsync(item => item.Userid == id);
        if (user == null || user.Role?.Rolename == "Customer") return NotFound();
        if (user.Isactive == true && CurrentUserId == id)
            return Conflict(new ApiErrorDto("Bạn không thể tự vô hiệu hóa tài khoản đang đăng nhập.", null));
        if (user.Isactive == true && await IsLastActiveAdminAsync(user))
            return Conflict(new ApiErrorDto("Không thể vô hiệu hóa Admin hoạt động cuối cùng.", null));
        user.Isactive = user.Isactive != true;
        await _context.SaveChangesAsync();
        return Ok(new ToggleUserActiveResponseDto(user.Userid, user.Isactive));
    }
}
