using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class Customer
{
    public int Customerid { get; set; }

    public string Fullname { get; set; } = null!;

    public string Phone { get; set; } = null!;

    public string? Email { get; set; }

    public string? Address { get; set; }

    public DateTime? Createdat { get; set; }

    public virtual ICollection<Chatsession> Chatsessions { get; set; } = new List<Chatsession>();

    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();

    public virtual ICollection<Review> Reviews { get; set; } = new List<Review>();

    public virtual ICollection<Warrantyclaim> Warrantyclaims { get; set; } = new List<Warrantyclaim>();

    public virtual ICollection<Returnrequest> Returnrequests { get; set; } = new List<Returnrequest>();
}
