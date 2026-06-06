using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class Cart
{
    public int Cartid { get; set; }

    public int Userid { get; set; }

    public DateTime? Createdat { get; set; }

    public DateTime? Updatedat { get; set; }

    public virtual User User { get; set; } = null!;

    public virtual ICollection<Cartitem> Cartitems { get; set; } = new List<Cartitem>();
}
