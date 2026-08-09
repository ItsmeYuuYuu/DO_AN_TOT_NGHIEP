namespace ECommerceBackend.Models;

public class Userrole
{
    public int Userid { get; set; }
    public int Roleid { get; set; }

    public virtual User User { get; set; } = null!;
    public virtual Role Role { get; set; } = null!;
}
