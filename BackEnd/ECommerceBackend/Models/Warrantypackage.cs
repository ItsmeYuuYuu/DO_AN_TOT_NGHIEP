using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class Warrantypackage
{
    public int Packageid { get; set; }

    public string Packagename { get; set; } = null!;

    public int Durationmonths { get; set; }

    public decimal Price { get; set; }

    public virtual ICollection<Orderitem> Orderitems { get; set; } = new List<Orderitem>();
}
