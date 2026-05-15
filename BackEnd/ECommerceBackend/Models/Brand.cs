using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class Brand
{
    public int Brandid { get; set; }

    public string Brandname { get; set; } = null!;

    public virtual ICollection<Product> Products { get; set; } = new List<Product>();
}
