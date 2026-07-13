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

    public DateTime? Reservationexpiresat { get; set; }

    public string? Paymenttoken { get; set; }

    public string? Guesttoken { get; set; }

    public string? Cancellationreason { get; set; }

    public int? Salesuserid { get; set; }
    
    public DateTime? Salesconfirmedat { get; set; }

    public int? Warehouseuserid { get; set; }

    public DateTime? Warehousecompletedat { get; set; }

    public virtual Customer? Customer { get; set; }

    public virtual ICollection<Orderpayment> Orderpayments { get; set; } = new List<Orderpayment>();

    public virtual ICollection<Inventorytransaction> Inventorytransactions { get; set; } = new List<Inventorytransaction>();

    public virtual ICollection<Orderitem> Orderitems { get; set; } = new List<Orderitem>();

    public virtual ICollection<Returnrequest> Returnrequests { get; set; } = new List<Returnrequest>();

    public virtual Shipment? Shipment { get; set; }

    public virtual User? User { get; set; }

    public virtual Voucher? VouchercodeNavigation { get; set; }
}
