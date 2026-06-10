using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace ECommerceBackend.DTOs.Orders
{
    public record CustomerLiteDto(int Customerid, string Fullname, string Phone, string? Email);

    public record OrderItemDto(
        int Orderitemid,
        int? Orderid,
        string? Imei,
        decimal Sellingprice,
        decimal? Warrantyprice,
        int? Packageid,
        string? Packagename,
        string? Productname,
        string? Variantsku
    );

    public record OrderPaymentDto(
        int Paymentid,
        string Provider,
        string Paymenttype,
        decimal Amount,
        string Status,
        string? Transactionref,
        DateTime? Createdat,
        DateTime? Paidat
    );

    public record OrderListItemDto(
        int Orderid,
        int? Customerid,
        DateTime? Orderdate,
        string? Orderstatus,
        decimal Totalamount,
        decimal? Discountamount,
        decimal Finalamount,
        string? Paymentmethod,
        string? Checkouttype,
        string? Paymentstatus,
        decimal? Requiredpayment,
        decimal? Paidamount,
        decimal? Depositpercentage,
        string? Shippingname,
        string? Shippingphone,
        string? Shippingemail,
        string? Shippingaddress,
        string? Customernote,
        DateTime? Reservationexpiresat,
        string? Paymenttoken,
        string? Cancellationreason,
        CustomerLiteDto? Customer,
        List<OrderItemDto>? Orderitems,
        List<OrderPaymentDto>? Orderpayments
    );

    public record OrderDetailDto : OrderListItemDto
    {
        public OrderDetailDto(
            int Orderid,
            int? Customerid,
            DateTime? Orderdate,
            string? Orderstatus,
            decimal Totalamount,
            decimal? Discountamount,
            decimal Finalamount,
            string? Paymentmethod,
            string? Checkouttype,
            string? Paymentstatus,
            decimal? Requiredpayment,
            decimal? Paidamount,
            decimal? Depositpercentage,
            string? Shippingname,
            string? Shippingphone,
            string? Shippingemail,
            string? Shippingaddress,
            string? Customernote,
            DateTime? Reservationexpiresat,
            string? Paymenttoken,
            string? Cancellationreason,
            CustomerLiteDto? Customer,
            List<OrderItemDto>? Orderitems,
            List<OrderPaymentDto>? Orderpayments
        ) : base(
            Orderid,
            Customerid,
            Orderdate,
            Orderstatus,
            Totalamount,
            Discountamount,
            Finalamount,
            Paymentmethod,
            Checkouttype,
            Paymentstatus,
            Requiredpayment,
            Paidamount,
            Depositpercentage,
            Shippingname,
            Shippingphone,
            Shippingemail,
            Shippingaddress,
            Customernote,
            Reservationexpiresat,
            Paymenttoken,
            Cancellationreason,
            Customer,
            Orderitems,
            Orderpayments) { }
    }

    public record CreateOrderItemRequestDto(
        [Required] int Variantid,
        [Range(1, 1000, ErrorMessage = "So luong phai tu 1 den 1000")] int Quantity,
        int? Packageid = null
    );

    public record CreateOrderRequestDto(
        int? Userid,
        [Required(ErrorMessage = "Phuong thuc thanh toan la bat buoc")] string? Paymentmethod,
        string? Vouchercode,
        [Required, MinLength(1, ErrorMessage = "Don hang phai co it nhat 1 san pham")] List<CreateOrderItemRequestDto> Items,
        string? Shippingaddress,
        string? Note,
        string? Paymentoption = null,
        string? Customername = null,
        string? Customerphone = null,
        string? Customeremail = null
    );

    public record UpdateOrderRequestDto(string? Paymentmethod, string? Vouchercode);

    public record UpdateOrderStatusRequestDto(
        [Required(ErrorMessage = "Trang thai la bat buoc")] string Status
    );

    public record UpdateOrderStatusResponseDto(int Orderid, string Orderstatus);

    public record ConfirmPaymentRequestDto(
        decimal? Amount,
        string? Transactionref,
        string? Note
    );

    public record SimulatePaymentRequestDto(
        [Required] string Paymenttoken,
        bool Success
    );

    public record PaymentCheckoutDto(
        int Orderid,
        string? Paymentmethod,
        string? Paymentstatus,
        decimal Finalamount,
        decimal Requiredpayment,
        decimal Paidamount,
        DateTime? Reservationexpiresat,
        string? Shippingname
    );

    public record PaymentActionResultDto(
        int Orderid,
        string Paymentstatus,
        decimal Paidamount,
        decimal Remainingamount,
        string? Transactionref
    );

    /// <summary>Safe limited DTO for public order lookup: no IMEI, no internal fields.</summary>
    public record OrderLookupDto(
        int Orderid,
        DateTime? Orderdate,
        string? Orderstatus,
        decimal Totalamount,
        decimal? Discountamount,
        decimal Finalamount,
        string? Paymentmethod,
        string? Vouchercode,
        int ItemCount
    );

    public record BulkUpdateStatusRequestDto(
        [Required, MinLength(1, ErrorMessage = "Can chon it nhat 1 don hang")] List<int> OrderIds,
        [Required(ErrorMessage = "Trang thai la bat buoc")] string Status
    );

    public record BulkUpdateFailedItemDto(int OrderId, string Reason);

    public record BulkUpdateStatusResponseDto(
        List<int> UpdatedOrderIds,
        List<BulkUpdateFailedItemDto> Failed,
        string Message
    );
}
