using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class Statuslog
{
    public int Logid { get; set; }

    public string Entitytype { get; set; } = null!;

    public int Entityid { get; set; }

    public string Actiontype { get; set; } = "StatusChanged";

    public string Fromstatus { get; set; } = null!;

    public string Tostatus { get; set; } = null!;

    public string? Note { get; set; }

    public string? Metadata { get; set; }

    public int? Userid { get; set; }

    public DateTime? Createdat { get; set; }

    public virtual User? User { get; set; }
}
