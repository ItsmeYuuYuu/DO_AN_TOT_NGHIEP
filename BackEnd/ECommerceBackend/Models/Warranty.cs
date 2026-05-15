using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class Warranty
{
    public int Warrantyid { get; set; }

    public string? Imei { get; set; }

    public int? Customerid { get; set; }

    public DateTime Startdate { get; set; }

    public DateTime Enddate { get; set; }

    public string? Status { get; set; }

    public virtual Customer? Customer { get; set; }

    public virtual Inventoryitem? ImeiNavigation { get; set; }
}
