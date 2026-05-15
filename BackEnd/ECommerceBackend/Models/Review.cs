using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class Review
{
    public int Reviewid { get; set; }

    public int? Variantid { get; set; }

    public int? Customerid { get; set; }

    public int? Rating { get; set; }

    public string? Comment { get; set; }

    public DateTime? Createdat { get; set; }

    public virtual Customer? Customer { get; set; }

    public virtual Productvariant? Variant { get; set; }
}
