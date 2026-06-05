using System;

namespace ECommerceBackend.Models;

public partial class Promotionalcontent
{
    public int Contentid { get; set; }

    public string Contenttype { get; set; } = null!;

    public string? Title { get; set; }

    public string Imageurl { get; set; } = null!;

    public string? Linkurl { get; set; }

    public int? Displayorder { get; set; }

    public bool? Isactive { get; set; }

    public DateTime? Createdat { get; set; }
}
