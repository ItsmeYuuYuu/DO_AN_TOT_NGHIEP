namespace ECommerceBackend.Models;

public class Permission
{
    public int Permissionid { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string Groupname { get; set; } = null!;
    public string? Description { get; set; }

    public virtual ICollection<Rolepermission> Rolepermissions { get; set; } = new List<Rolepermission>();
}
