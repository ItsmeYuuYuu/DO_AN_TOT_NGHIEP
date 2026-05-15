using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class Purchaseorder
{
    public int Poid { get; set; }

    public int? Supplierid { get; set; }

    public int? Userid { get; set; }

    public DateTime? Importdate { get; set; }

    public decimal Totalamount { get; set; }

    public decimal? Taxfee { get; set; }

    public decimal? Shippingfee { get; set; }

    public string? Status { get; set; }

    public virtual ICollection<Purchaseorderdetail> Purchaseorderdetails { get; set; } = new List<Purchaseorderdetail>();

    public virtual Supplier? Supplier { get; set; }

    public virtual User? User { get; set; }
}
