namespace ECommerceBackend.Models;

public partial class Returnitem
{
    public int Returnitemid { get; set; }

    public int Returnrequestid { get; set; }

    public int Orderitemid { get; set; }

    public string Imei { get; set; } = null!;

    public string? Condition { get; set; }

    public string? Disposition { get; set; }

    public string? Replacementimei { get; set; }

    public decimal Refundamount { get; set; }

    public virtual Returnrequest Returnrequest { get; set; } = null!;

    public virtual Orderitem Orderitem { get; set; } = null!;

    public virtual Inventoryitem Inventoryitem { get; set; } = null!;

    public virtual Inventoryitem? Replacementinventoryitem { get; set; }
}
