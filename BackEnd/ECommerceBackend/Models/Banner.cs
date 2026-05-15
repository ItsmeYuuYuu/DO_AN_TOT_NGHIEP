using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class Banner
{
    public int Bannerid { get; set; }

    public string? Position { get; set; }

    public string Imageurl { get; set; } = null!;

    public string? Linkurl { get; set; }

    public bool? Isactive { get; set; }
}
