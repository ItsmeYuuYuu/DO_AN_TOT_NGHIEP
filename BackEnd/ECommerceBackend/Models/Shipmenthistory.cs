namespace ECommerceBackend.Models;

public partial class Shipmenthistory
{
    public int Historyid { get; set; }

    public int Shipmentid { get; set; }

    public int? Userid { get; set; }

    public string? Fromstatus { get; set; }

    public string Tostatus { get; set; } = null!;

    public string? Note { get; set; }

    public DateTime? Createdat { get; set; }

    public virtual Shipment Shipment { get; set; } = null!;

    public virtual User? User { get; set; }
}
