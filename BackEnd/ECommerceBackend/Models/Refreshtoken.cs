namespace ECommerceBackend.Models;

public class Refreshtoken
{
    public Guid Refreshtokenid { get; set; }
    public int Userid { get; set; }
    public string Tokenhash { get; set; } = null!;
    public string Sessionid { get; set; } = null!;
    public DateTime Createdat { get; set; }
    public DateTime Expiresat { get; set; }
    public DateTime? Revokedat { get; set; }
    public virtual User User { get; set; } = null!;
}
