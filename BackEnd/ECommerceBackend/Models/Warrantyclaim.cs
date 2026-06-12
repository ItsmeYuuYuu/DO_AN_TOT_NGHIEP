namespace ECommerceBackend.Models;

public class Warrantyclaim
{
    public int Claimid { get; set; }

    public string Imei { get; set; } = null!;

    public int Customerid { get; set; }

    public int? Assigneduserid { get; set; }

    public string Faultdescription { get; set; } = null!;

    public string Status { get; set; } = "Received";

    public string Coverage { get; set; } = "InWarranty";

    public string? Imageurls { get; set; }

    public decimal? Estimatedcost { get; set; }

    public decimal? Finalcost { get; set; }

    public string? Conclusion { get; set; }

    public DateTime Receivedat { get; set; }

    public DateTime? Completedat { get; set; }

    public DateTime Createdat { get; set; }

    public DateTime Updatedat { get; set; }

    public virtual Inventoryitem Inventoryitem { get; set; } = null!;

    public virtual Customer Customer { get; set; } = null!;

    public virtual User? Assigneduser { get; set; }

    public virtual ICollection<Warrantyclaimhistory> Histories { get; set; } = new List<Warrantyclaimhistory>();
}
