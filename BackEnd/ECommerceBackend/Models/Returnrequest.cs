namespace ECommerceBackend.Models;

public partial class Returnrequest
{
    public int Returnrequestid { get; set; }

    public int Orderid { get; set; }

    public int? Customerid { get; set; }

    public int? Requestedbyuserid { get; set; }

    public int? Assigneduserid { get; set; }

    public string Requesttype { get; set; } = null!;

    public string Reason { get; set; } = null!;

    public string? Description { get; set; }

    public string Status { get; set; } = null!;

    public string? Imageurls { get; set; }

    public string? Reviewnote { get; set; }

    public string? Resolution { get; set; }

    public decimal Requestedrefundamount { get; set; }

    public decimal? Refundamount { get; set; }

    public string Refundstatus { get; set; } = null!;

    public DateTime? Requestedat { get; set; }

    public DateTime? Reviewedat { get; set; }

    public DateTime? Receivedat { get; set; }

    public DateTime? Completedat { get; set; }

    public DateTime? Updatedat { get; set; }

    public virtual Order Order { get; set; } = null!;

    public virtual Customer? Customer { get; set; }

    public virtual User? Requestedbyuser { get; set; }

    public virtual User? Assigneduser { get; set; }

    public virtual ICollection<Returnitem> Returnitems { get; set; } = new List<Returnitem>();
}
