using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class Cartitem
{
    public int Cartitemid { get; set; }

    public int Cartid { get; set; }

    public int Variantid { get; set; }

    public int Quantity { get; set; }

    public DateTime? Createdat { get; set; }

    public virtual Cart Cart { get; set; } = null!;

    public virtual Productvariant Variant { get; set; } = null!;
}
