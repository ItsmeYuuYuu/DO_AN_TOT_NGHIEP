using System;

namespace ECommerceBackend.Models;

public partial class Homepageproductsectionitem
{
    public int Itemid { get; set; }

    public int Sectionid { get; set; }

    public int Productid { get; set; }

    public int? Displayorder { get; set; }

    public bool? Isactive { get; set; }

    public DateTime? Createdat { get; set; }

    public virtual Homepageproductsection Section { get; set; } = null!;

    public virtual Product Product { get; set; } = null!;
}
