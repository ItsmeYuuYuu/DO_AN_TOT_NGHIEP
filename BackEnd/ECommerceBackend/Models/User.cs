using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class User
{
    public int Userid { get; set; }

    public int? Roleid { get; set; }

    public string Username { get; set; } = null!;

    public string Passwordhash { get; set; } = null!;

    public string Fullname { get; set; } = null!;

    public string? Email { get; set; }

    public string? Phone { get; set; }

    public DateTime? Createdat { get; set; }

    public bool? Isactive { get; set; }

    public virtual ICollection<Auditlog> Auditlogs { get; set; } = new List<Auditlog>();

    public virtual ICollection<News> News { get; set; } = new List<News>();

    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();


    public virtual Role? Role { get; set; }

    public virtual Cart? Cart { get; set; }
}
