using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class Attribute
{
    public int Attributeid { get; set; }

    public string Attributename { get; set; } = null!;

    public virtual ICollection<Attributevalue> Attributevalues { get; set; } = new List<Attributevalue>();
}
