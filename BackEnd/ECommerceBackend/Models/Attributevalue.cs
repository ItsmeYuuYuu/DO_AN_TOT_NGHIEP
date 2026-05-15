using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class Attributevalue
{
    public int Valueid { get; set; }

    public int? Attributeid { get; set; }

    public string Valuename { get; set; } = null!;

    public virtual Attribute? Attribute { get; set; }

    public virtual ICollection<Productvariant> Variants { get; set; } = new List<Productvariant>();
}
