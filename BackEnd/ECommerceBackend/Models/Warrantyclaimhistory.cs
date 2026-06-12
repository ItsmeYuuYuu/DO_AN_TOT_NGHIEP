namespace ECommerceBackend.Models;

public class Warrantyclaimhistory
{
    public int Historyid { get; set; }

    public int Claimid { get; set; }

    public int? Userid { get; set; }

    public string? Fromstatus { get; set; }

    public string Tostatus { get; set; } = null!;

    public string? Note { get; set; }

    public DateTime Createdat { get; set; }

    public virtual Warrantyclaim Claim { get; set; } = null!;

    public virtual User? User { get; set; }
}
