namespace ECommerceBackend.Models;

public partial class Refundtransaction
{
    public int Refundtransactionid { get; set; }

    public int Returnrequestid { get; set; }

    public int Orderid { get; set; }

    public int? Processedbyuserid { get; set; }

    public decimal Amount { get; set; }

    public string Provider { get; set; } = null!;

    public string Status { get; set; } = null!;

    public string? Transactionref { get; set; }

    public string? Note { get; set; }

    public DateTime? Createdat { get; set; }

    public DateTime? Processedat { get; set; }

    public virtual Returnrequest Returnrequest { get; set; } = null!;

    public virtual Order Order { get; set; } = null!;

    public virtual User? Processedbyuser { get; set; }
}
