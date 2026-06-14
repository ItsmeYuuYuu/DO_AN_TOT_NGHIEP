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

    public virtual ICollection<Orderassignment> AssignedOrderassignments { get; set; } = new List<Orderassignment>();

    public virtual ICollection<Orderassignment> CreatedOrderassignments { get; set; } = new List<Orderassignment>();

    public virtual ICollection<Inventorytransaction> Inventorytransactions { get; set; } = new List<Inventorytransaction>();

    public virtual ICollection<Warrantyclaim> AssignedWarrantyclaims { get; set; } = new List<Warrantyclaim>();

    public virtual ICollection<Warrantyclaimhistory> Warrantyclaimhistories { get; set; } = new List<Warrantyclaimhistory>();

    public virtual ICollection<Returnrequest> RequestedReturnrequests { get; set; } = new List<Returnrequest>();

    public virtual ICollection<Returnrequest> AssignedReturnrequests { get; set; } = new List<Returnrequest>();

    public virtual ICollection<Returnrequesthistory> Returnrequesthistories { get; set; } = new List<Returnrequesthistory>();

    public virtual ICollection<Refundtransaction> Refundtransactions { get; set; } = new List<Refundtransaction>();

    public virtual ICollection<Shipment> CreatedShipments { get; set; } = new List<Shipment>();

    public virtual ICollection<Shipmenthistory> Shipmenthistories { get; set; } = new List<Shipmenthistory>();

    public virtual Role? Role { get; set; }

    public virtual Cart? Cart { get; set; }
}
