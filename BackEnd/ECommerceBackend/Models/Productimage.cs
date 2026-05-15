using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class Productimage
{
    public int Imageid { get; set; }

    public int? Variantid { get; set; }

    public string Imageurl { get; set; } = null!;

    public bool? Ismain { get; set; }

    public virtual Productvariant? Variant { get; set; }
}
