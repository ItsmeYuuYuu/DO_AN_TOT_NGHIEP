namespace ECommerceBackend.Models;

public partial class Shipment
{
    public int Shipmentid { get; set; }

    public int Orderid { get; set; }

    public string Carrier { get; set; } = null!;

    public string Trackingcode { get; set; } = null!;

    public decimal Shippingfee { get; set; }

    public string Status { get; set; } = null!;

    public DateTime? Estimateddeliveryat { get; set; }

    public int Deliveryattempts { get; set; }

    public int? Createdbyuserid { get; set; }

    public DateTime? Createdat { get; set; }

    public DateTime? Updatedat { get; set; }

    public DateTime? Pickedupat { get; set; }

    public DateTime? Deliveredat { get; set; }

    public DateTime? Returnedat { get; set; }

    public virtual Order Order { get; set; } = null!;

    public virtual User? Createdbyuser { get; set; }

    public virtual ICollection<Statuslog> Histories { get; set; } = new List<Statuslog>();
}
