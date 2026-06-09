using System;
using System.Collections.Generic;

namespace ECommerceBackend.Models;

public partial class Order
{
    public int Orderid { get; set; }

    public int? Customerid { get; set; }

    public int? Userid { get; set; }

    public string? Vouchercode { get; set; }

    public DateTime? Orderdate { get; set; }

    public decimal Totalamount { get; set; }

    public decimal? Discountamount { get; set; }

    public decimal Finalamount { get; set; }

    public string? Paymentmethod { get; set; }

    public string? Orderstatus { get; set; }

    public string? Checkouttype { get; set; }

    public string? Paymentstatus { get; set; }

    public decimal? Requiredpayment { get; set; }

    public decimal? Paidamount { get; set; }

    public decimal? Depositpercentage { get; set; }

    public string? Shippingname { get; set; }

    public string? Shippingphone { get; set; }

    public string? Shippingemail { get; set; }

    public string? Shippingaddress { get; set; }

    public string? Customernote { get; set; }

    public virtual Customer? Customer { get; set; }

    public virtual ICollection<Orderpayment> Orderpayments { get; set; } = new List<Orderpayment>();

    public virtual ICollection<Orderitem> Orderitems { get; set; } = new List<Orderitem>();

    public virtual User? User { get; set; }

    public virtual Voucher? VouchercodeNavigation { get; set; }
}
