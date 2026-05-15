using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class Orderitem
{
    public int Orderitemid { get; set; }

    public int? Orderid { get; set; }

    public string? Imei { get; set; }

    public int? Packageid { get; set; }

    public decimal Sellingprice { get; set; }

    public decimal? Warrantyprice { get; set; }

    public virtual Inventoryitem? ImeiNavigation { get; set; }

    public virtual Order? Order { get; set; }

    public virtual Warrantypackage? Package { get; set; }
}
