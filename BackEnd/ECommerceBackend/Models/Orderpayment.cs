using System;

namespace ECommerceBackend.Models;

public partial class Orderpayment
{
    public int Paymentid { get; set; }

    public int Orderid { get; set; }

    public string Provider { get; set; } = null!;

    public string Paymenttype { get; set; } = null!;

    public decimal Amount { get; set; }

    public string Status { get; set; } = null!;

    public string? Transactionref { get; set; }

    public DateTime? Createdat { get; set; }

    public DateTime? Paidat { get; set; }

    public string? Transactiontype { get; set; }

    public int? Returnrequestid { get; set; }

    public virtual Order Order { get; set; } = null!;
}
