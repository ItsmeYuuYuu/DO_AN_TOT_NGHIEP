namespace ECommerceBackend.Models;

public partial class Returnrequesthistory
{
    public int Historyid { get; set; }

    public int Returnrequestid { get; set; }

    public int? Userid { get; set; }

    public string? Fromstatus { get; set; }

    public string Tostatus { get; set; } = null!;

    public string? Note { get; set; }

    public DateTime? Createdat { get; set; }

    public virtual Returnrequest Returnrequest { get; set; } = null!;

    public virtual User? User { get; set; }
}
