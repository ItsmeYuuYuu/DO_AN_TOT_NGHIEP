using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class News
{
    public int Postid { get; set; }

    public int? Userid { get; set; }

    public string Title { get; set; } = null!;

    public string? Summary { get; set; }

    public string? Content { get; set; }

    public string? Thumbnail { get; set; }

    public DateTime? Createdat { get; set; }

    public bool? Isactive { get; set; }

    public virtual User? User { get; set; }
}
