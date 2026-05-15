using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class Productcondition
{
    public int Conditionid { get; set; }

    public string Conditionname { get; set; } = null!;

    public string? Description { get; set; }

    public virtual ICollection<Productvariant> Productvariants { get; set; } = new List<Productvariant>();
}
