namespace ECommerceBackend.Models;

public partial class Inventorytransaction
{
    public int Transactionid { get; set; }

    public string Imei { get; set; } = null!;

    public int? Orderid { get; set; }

    public int? Userid { get; set; }

    public string Transactiontype { get; set; } = null!;

    public string? Fromstatus { get; set; }

    public string Tostatus { get; set; } = null!;

    public string? Note { get; set; }

    public DateTime? Createdat { get; set; }

    public virtual Inventoryitem Inventoryitem { get; set; } = null!;

    public virtual Order? Order { get; set; }

    public virtual User? User { get; set; }
}
