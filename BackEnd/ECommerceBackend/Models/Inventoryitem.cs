using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class Inventoryitem
{
    public string Imei { get; set; } = null!;

    public int? Variantid { get; set; }

    public int? Podetailid { get; set; }

    public string? Status { get; set; }

    public DateTime? Importedat { get; set; }

    public virtual ICollection<Orderitem> Orderitems { get; set; } = new List<Orderitem>();

    public virtual Purchaseorderdetail? Podetail { get; set; }

    public virtual Productvariant? Variant { get; set; }

    public virtual ICollection<Warranty> Warranties { get; set; } = new List<Warranty>();
}
