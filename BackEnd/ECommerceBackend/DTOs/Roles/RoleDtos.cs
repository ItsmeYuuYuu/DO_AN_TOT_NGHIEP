using System.ComponentModel.DataAnnotations;

namespace ECommerceBackend.DTOs.Roles
{
    public record RoleDto(
        int Roleid,
        string Rolename
    );

    public record CreateRoleRequestDto(
        [Required(ErrorMessage = "Tên vai trò là bắt buộc")]
        [StringLength(50, ErrorMessage = "Tên vai trò không quá 50 ký tự")]
        string Rolename
    );

    public record UpdateRoleRequestDto(
        [Required(ErrorMessage = "Tên vai trò là bắt buộc")]
        [StringLength(50, ErrorMessage = "Tên vai trò không quá 50 ký tự")]
        string Rolename
    );
}
