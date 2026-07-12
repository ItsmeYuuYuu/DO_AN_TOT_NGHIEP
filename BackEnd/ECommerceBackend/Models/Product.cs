using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class Product
{
    public int Productid { get; set; }

    public int? Categoryid { get; set; }

    public int? Brandid { get; set; }

    public string? Seriesname { get; set; }

    public string Productname { get; set; } = null!;

    public string? Slug { get; set; }

    public string? Description { get; set; }

    public DateTime? Createdat { get; set; }

    public virtual Brand? Brand { get; set; }

    public virtual Category? Category { get; set; }

    public virtual ICollection<Chatproductrecommendation> Chatproductrecommendations { get; set; } = new List<Chatproductrecommendation>();

    public virtual ICollection<Productvariant> Productvariants { get; set; } = new List<Productvariant>();
}
