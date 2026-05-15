using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class Productvariant
{
    public int Variantid { get; set; }

    public int? Productid { get; set; }

    public int? Conditionid { get; set; }

    public string? Sku { get; set; }

    public decimal Baseprice { get; set; }

    public decimal? Saleprice { get; set; }

    public virtual Productcondition? Condition { get; set; }

    public virtual ICollection<Inventoryitem> Inventoryitems { get; set; } = new List<Inventoryitem>();

    public virtual Product? Product { get; set; }

    public virtual ICollection<Productimage> Productimages { get; set; } = new List<Productimage>();

    public virtual ICollection<Purchaseorderdetail> Purchaseorderdetails { get; set; } = new List<Purchaseorderdetail>();

    public virtual ICollection<Review> Reviews { get; set; } = new List<Review>();

    public virtual ICollection<Attributevalue> Values { get; set; } = new List<Attributevalue>();
}
