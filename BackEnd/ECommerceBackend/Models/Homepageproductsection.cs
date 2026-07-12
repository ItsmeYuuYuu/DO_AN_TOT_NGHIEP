using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class Homepageproductsection
{
    public int Sectionid { get; set; }

    public string Sectionkey { get; set; } = null!;

    public string Title { get; set; } = null!;

    public string? Subtitle { get; set; }

    public string Theme { get; set; } = "LightBlue";

    public int? Displayorder { get; set; }

    public bool? Isactive { get; set; }

    public DateTime? Createdat { get; set; }

    public string? Productids { get; set; }

    public string? Type { get; set; }

    public string? Bannercontent { get; set; }
}
