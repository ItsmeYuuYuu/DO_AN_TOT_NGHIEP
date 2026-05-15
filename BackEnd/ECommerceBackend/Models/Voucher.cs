using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class Voucher
{
    public string Vouchercode { get; set; } = null!;

    public decimal? Discountamount { get; set; }

    public double? Discountpercentage { get; set; }

    public DateTime? Validfrom { get; set; }

    public DateTime? Validto { get; set; }

    public bool? Isactive { get; set; }

    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();
}
