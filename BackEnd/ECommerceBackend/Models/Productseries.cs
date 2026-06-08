using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class Productseries
{
    public int Seriesid { get; set; }

    public int Brandid { get; set; }

    public string Seriesname { get; set; } = null!;

    public int? Displayorder { get; set; }

    public bool? Isactive { get; set; }

    public DateTime? Createdat { get; set; }

    public virtual Brand Brand { get; set; } = null!;

    public virtual ICollection<Product> Products { get; set; } = new List<Product>();
}
