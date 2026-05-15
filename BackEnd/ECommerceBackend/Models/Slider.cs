using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class Slider
{
    public int Sliderid { get; set; }

    public string? Title { get; set; }

    public string Imageurl { get; set; } = null!;

    public string? Linkurl { get; set; }

    public int? Displayorder { get; set; }

    public bool? Isactive { get; set; }

    public DateTime? Createdat { get; set; }
}
