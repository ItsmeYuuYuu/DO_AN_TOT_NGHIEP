namespace ECommerceBackend.Models;

public class Rolepermission
{
    public int Roleid { get; set; }
    public int Permissionid { get; set; }

    public virtual Role Role { get; set; } = null!;
    public virtual Permission Permission { get; set; } = null!;
}
