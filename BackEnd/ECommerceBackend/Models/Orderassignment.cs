namespace ECommerceBackend.Models;

public partial class Orderassignment
{
    public int Assignmentid { get; set; }

    public int Orderid { get; set; }

    public string Department { get; set; } = null!;

    public int? Assigneduserid { get; set; }

    public int? Assignedbyuserid { get; set; }

    public string Status { get; set; } = null!;

    public DateTime? Assignedat { get; set; }

    public DateTime? Completedat { get; set; }

    public string? Note { get; set; }

    public virtual Order Order { get; set; } = null!;

    public virtual User? Assigneduser { get; set; }

    public virtual User? Assignedbyuser { get; set; }
}
