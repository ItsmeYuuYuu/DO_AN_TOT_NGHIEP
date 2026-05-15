using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class Purchaseorderdetail
{
    public int Podetailid { get; set; }

    public int? Poid { get; set; }

    public int? Variantid { get; set; }

    public int Quantity { get; set; }

    public decimal Importprice { get; set; }

    public virtual ICollection<Inventoryitem> Inventoryitems { get; set; } = new List<Inventoryitem>();

    public virtual Purchaseorder? Po { get; set; }

    public virtual Productvariant? Variant { get; set; }
}
