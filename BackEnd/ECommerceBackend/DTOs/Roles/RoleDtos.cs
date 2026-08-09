using System.ComponentModel.DataAnnotations;
using ECommerceBackend.Validation;

namespace ECommerceBackend.DTOs.Roles;

public record PermissionDto(int Permissionid, string Code, string Name, string Groupname, string? Description);

public record RoleDto(int Roleid, string Rolename, IReadOnlyList<string> Permissions);

public record CreateRoleRequestDto(
    [Required(ErrorMessage = "Tên vai trò là bắt buộc")]
    [StringLength(50, ErrorMessage = "Tên vai trò không quá 50 ký tự")]
    [SafeText(ErrorMessage = "Tên vai trò chứa nội dung không an toàn")]
    string Rolename,
    IReadOnlyList<string>? Permissions = null);

public record UpdateRoleRequestDto(
    [Required(ErrorMessage = "Tên vai trò là bắt buộc")]
    [StringLength(50, ErrorMessage = "Tên vai trò không quá 50 ký tự")]
    [SafeText(ErrorMessage = "Tên vai trò chứa nội dung không an toàn")]
    string Rolename,
    IReadOnlyList<string>? Permissions = null);
