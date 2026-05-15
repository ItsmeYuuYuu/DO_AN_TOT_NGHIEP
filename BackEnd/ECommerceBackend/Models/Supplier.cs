using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class Supplier
{
    public int Supplierid { get; set; }

    public string Suppliername { get; set; } = null!;

    public string? Contactphone { get; set; }

    public string? Address { get; set; }

    public virtual ICollection<Purchaseorder> Purchaseorders { get; set; } = new List<Purchaseorder>();
}
