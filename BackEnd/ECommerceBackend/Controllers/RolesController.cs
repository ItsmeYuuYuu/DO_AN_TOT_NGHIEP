using ECommerceBackend.Authorization;
using ECommerceBackend.DTOs.Common;
using ECommerceBackend.DTOs.Roles;
using ECommerceBackend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ECommerceBackend.Controllers;

[Route("api/[controller]")]
[ApiController]
[HasPermission(AppPermissions.RolesManage)]
public class RolesController : ControllerBase
{
    private static readonly HashSet<string> ProtectedRoles = new(
        new[] { "Admin", "Customer" }, StringComparer.OrdinalIgnoreCase);
    private readonly ECommerceContext _context;

    public RolesController(ECommerceContext context) => _context = context;

    private async Task<RoleDto> MapToDtoAsync(Role role)
    {
        var permissions = string.Equals(role.Rolename, "Admin", StringComparison.OrdinalIgnoreCase)
            ? AppPermissions.All.Select(item => item.Code).ToList()
            : await _context.Rolepermissions.AsNoTracking()
                .Where(item => item.Roleid == role.Roleid)
                .Select(item => item.Permission.Code)
                .OrderBy(code => code)
                .ToListAsync();
        return new RoleDto(role.Roleid, role.Rolename, permissions);
    }

    private async Task<List<Permission>> ResolvePermissionsAsync(IReadOnlyList<string>? codes)
    {
        var normalized = (codes ?? Array.Empty<string>())
            .Where(code => !string.IsNullOrWhiteSpace(code))
            .Select(code => code.Trim().ToLowerInvariant())
            .Distinct()
            .ToList();
        return await _context.Permissions.Where(item => normalized.Contains(item.Code)).ToListAsync();
    }

    private async Task ReplacePermissionsAsync(Role role, IReadOnlyList<string>? codes)
    {
        var requested = (codes ?? Array.Empty<string>()).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var permissions = await ResolvePermissionsAsync(requested);
        if (permissions.Count != requested.Count)
            throw new ArgumentException("Danh sách quyền chứa mã không tồn tại.");

        await _context.Rolepermissions.Where(item => item.Roleid == role.Roleid).ExecuteDeleteAsync();
        _context.Rolepermissions.AddRange(permissions.Select(permission => new Rolepermission
        {
            Roleid = role.Roleid,
            Permissionid = permission.Permissionid
        }));
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<RoleDto>>> GetRoles()
    {
        var roles = await _context.Roles.AsNoTracking().OrderBy(role => role.Roleid).ToListAsync();
        var result = new List<RoleDto>();
        foreach (var role in roles) result.Add(await MapToDtoAsync(role));
        return Ok(result);
    }

    [HttpGet("permissions")]
    public async Task<ActionResult<IEnumerable<PermissionDto>>> GetPermissions()
    {
        var permissions = await _context.Permissions.AsNoTracking()
            .OrderBy(item => item.Groupname).ThenBy(item => item.Name)
            .Select(item => new PermissionDto(item.Permissionid, item.Code, item.Name, item.Groupname, item.Description))
            .ToListAsync();
        return Ok(permissions);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<RoleDto>> GetRole(int id)
    {
        var role = await _context.Roles.AsNoTracking().FirstOrDefaultAsync(item => item.Roleid == id);
        return role == null ? NotFound() : Ok(await MapToDtoAsync(role));
    }

    [HttpPost]
    public async Task<ActionResult<RoleDto>> PostRole([FromBody] CreateRoleRequestDto dto)
    {
        var name = dto.Rolename.Trim();
        if (await _context.Roles.AnyAsync(item => item.Rolename.ToLower() == name.ToLower()))
            return Conflict(new ApiErrorDto("Tên vai trò đã tồn tại.", null));

        var role = new Role { Rolename = name };
        _context.Roles.Add(role);
        await _context.SaveChangesAsync();
        try
        {
            await ReplacePermissionsAsync(role, dto.Permissions);
            await _context.SaveChangesAsync();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ApiErrorDto(ex.Message, null));
        }
        return CreatedAtAction(nameof(GetRole), new { id = role.Roleid }, await MapToDtoAsync(role));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<RoleDto>> PutRole(int id, [FromBody] UpdateRoleRequestDto dto)
    {
        var role = await _context.Roles.FirstOrDefaultAsync(item => item.Roleid == id);
        if (role == null) return NotFound();

        var name = dto.Rolename.Trim();
        if (ProtectedRoles.Contains(role.Rolename) && !string.Equals(role.Rolename, name, StringComparison.OrdinalIgnoreCase))
            return Conflict(new ApiErrorDto("Không thể đổi tên vai trò hệ thống Admin hoặc Customer.", null));
        if (await _context.Roles.AnyAsync(item => item.Roleid != id && item.Rolename.ToLower() == name.ToLower()))
            return Conflict(new ApiErrorDto("Tên vai trò đã tồn tại.", null));

        role.Rolename = name;
        try
        {
            if (!string.Equals(role.Rolename, "Admin", StringComparison.OrdinalIgnoreCase))
                await ReplacePermissionsAsync(role, dto.Permissions);
            await _context.SaveChangesAsync();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ApiErrorDto(ex.Message, null));
        }
        return Ok(await MapToDtoAsync(role));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteRole(int id)
    {
        var role = await _context.Roles.FindAsync(id);
        if (role == null) return NotFound();
        if (ProtectedRoles.Contains(role.Rolename))
            return Conflict(new ApiErrorDto("Không thể xóa vai trò hệ thống Admin hoặc Customer.", null));
        if (await _context.Userroles.AnyAsync(item => item.Roleid == id) ||
            await _context.Users.AnyAsync(item => item.Roleid == id))
            return Conflict(new ApiErrorDto("Vai trò đang được gán cho tài khoản nhân viên.", null));

        _context.Roles.Remove(role);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
