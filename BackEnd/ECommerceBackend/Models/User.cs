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

    public virtual ICollection<Content> Contents { get; set; } = new List<Content>();

    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();

    public virtual ICollection<Inventorytransaction> Inventorytransactions { get; set; } = new List<Inventorytransaction>();

    public virtual ICollection<Warrantyclaim> AssignedWarrantyclaims { get; set; } = new List<Warrantyclaim>();

    public virtual ICollection<Returnrequest> RequestedReturnrequests { get; set; } = new List<Returnrequest>();

    public virtual ICollection<Returnrequest> AssignedReturnrequests { get; set; } = new List<Returnrequest>();

    public virtual ICollection<Shipment> CreatedShipments { get; set; } = new List<Shipment>();

    public virtual ICollection<Statuslog> Statuslogs { get; set; } = new List<Statuslog>();

    public virtual Role? Role { get; set; }

    public virtual ICollection<Userrole> Userroles { get; set; } = new List<Userrole>();

    public virtual Cart? Cart { get; set; }
}
