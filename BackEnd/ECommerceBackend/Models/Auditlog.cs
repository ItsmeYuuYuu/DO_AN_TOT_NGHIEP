using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class Auditlog
{
    public int Logid { get; set; }

    public int? Userid { get; set; }

    public string Action { get; set; } = null!;

    public string? Tablename { get; set; }

    public string? Recordid { get; set; }

    public DateTime? Createdat { get; set; }

    public virtual User? User { get; set; }
}
