using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class Inventoryitem
{
    public string Imei { get; set; } = null!;

    public int? Variantid { get; set; }

    public string? Status { get; set; }

    public DateTime? Importedat { get; set; }

    public DateTime? Warrantystartdate { get; set; }

    public DateTime? Warrantyenddate { get; set; }

    public string? Warrantystatus { get; set; }

    public virtual ICollection<Orderitem> Orderitems { get; set; } = new List<Orderitem>();

    public virtual Productvariant? Variant { get; set; }
}
