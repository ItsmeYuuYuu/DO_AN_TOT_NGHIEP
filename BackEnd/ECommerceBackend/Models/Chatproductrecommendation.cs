using System;

namespace ECommerceBackend.Models;

public class Chatproductrecommendation
{
    public int Recommendationid { get; set; }

    public int Messageid { get; set; }

    public int Productid { get; set; }

    public int Variantid { get; set; }

    public int Rank { get; set; }

    public DateTime? Createdat { get; set; }

    public DateTime? Addedtocartat { get; set; }

    public DateTime? Orderedat { get; set; }

    public int? Orderid { get; set; }

    public virtual Chatmessage Message { get; set; } = null!;

    public virtual Order? Order { get; set; }

    public virtual Product Product { get; set; } = null!;

    public virtual Productvariant Variant { get; set; } = null!;
}
