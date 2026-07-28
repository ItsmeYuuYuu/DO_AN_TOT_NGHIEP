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
        string? Variantsku,
        int? Variantid,
        int? Productid,
        string? Imageurl
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
        decimal Shippingfee,
        string? Customernote,
        DateTime? Reservationexpiresat,
        string? Paymenttoken,
        string? Cancellationreason,
        CustomerLiteDto? Customer,
        List<OrderItemDto>? Orderitems,
        List<OrderPaymentDto>? Orderpayments,
        ShipmentLookupDto? Shipment
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
            decimal Shippingfee,
            string? Customernote,
            DateTime? Reservationexpiresat,
            string? Paymenttoken,
            string? Cancellationreason,
            CustomerLiteDto? Customer,
            List<OrderItemDto>? Orderitems,
            List<OrderPaymentDto>? Orderpayments,
            ShipmentLookupDto? Shipment = null
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
            Shippingfee,
            Customernote,
            Reservationexpiresat,
            Paymenttoken,
            Cancellationreason,
            Customer,
            Orderitems,
            Orderpayments,
            Shipment) { }
    }

    public record CreateOrderItemRequestDto(
        [Required] int Variantid,
        [Range(1, 1000, ErrorMessage = "So luong phai tu 1 den 1000")] int Quantity,
        int? Packageid = null
    );

    public record CreateOrderRequestDto(
        int? Userid,
        [Required(ErrorMessage = "Phương thức thanh toán là bắt buộc")] string? Paymentmethod,
        string? Vouchercode,
        [Required, MinLength(1, ErrorMessage = "Đơn hàng phải có ít nhất 1 sản phẩm")] List<CreateOrderItemRequestDto> Items,
        string? Shippingaddress,
        string? Note,
        string? Paymentoption = null,
        string? Customername = null,
        [RegularExpression(@"^0\d{9}$", ErrorMessage = "Số điện thoại nhận hàng phải gồm 10 chữ số và bắt đầu bằng 0")]
        string? Customerphone = null,
        [EmailAddress(ErrorMessage = "Địa chỉ email nhận thông báo không hợp lệ")]
        string? Customeremail = null,
        string? Shippingprovince = null,
        string? Shippingward = null
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

    public record CancelPaymentRequestDto(
        [Required] string Paymenttoken
    );

    public record PaymentCheckoutDto(
        int Orderid,
        string? Paymentmethod,
        string? Paymentstatus,
        decimal Finalamount,
        decimal Shippingfee,
        decimal Requiredpayment,
        decimal Paidamount,
        DateTime? Reservationexpiresat,
        string? Shippingname,
        string? QrImageUrl,
        string? QrContent,
        string? PaymentInstructions,
        bool RequiresStaffConfirmation
    );

    public record PaymentActionResultDto(
        int Orderid,
        string Paymentstatus,
        decimal Paidamount,
        decimal Remainingamount,
        string? Transactionref
    );

    /// <summary>Safe limited DTO for public order lookup: no IMEI, no internal fields.</summary>
    public record ShipmentLookupHistoryDto(
        string Status,
        string? Note,
        DateTime? Createdat
    );

    public record ShipmentLookupDto(
        string Carrier,
        string Trackingcode,
        string Status,
        DateTime? Estimateddeliveryat,
        int Deliveryattempts,
        DateTime? Deliveredat,
        List<ShipmentLookupHistoryDto> Histories
    );

    public record OrderItemLookupDto(
        string? Productname,
        string? Sku,
        decimal Sellingprice,
        string? Packagename,
        decimal? Warrantyprice,
        int? Variantid,
        int? Productid,
        string? Imageurl
    );

    public record OrderLookupDto(
        int Orderid,
        DateTime? Orderdate,
        string? Orderstatus,
        decimal Totalamount,
        decimal? Discountamount,
        decimal Finalamount,
        decimal Shippingfee,
        string? Paymentmethod,
        string? Paymentstatus,
        string? Vouchercode,
        int ItemCount,
        ShipmentLookupDto? Shipment,
        List<OrderItemLookupDto> Orderitems,
        string? Shippingname,
        string? Shippingphone,
        string? Shippingemail,
        string? Shippingaddress,
        string? Customernote
    );

    public record BulkUpdateStatusRequestDto(
        [Required, MinLength(1, ErrorMessage = "Cần chọn ít nhất 1 đơn hàng")] List<int> OrderIds,
        [Required(ErrorMessage = "Trạng thái là bắt buộc")] string Status
    );

    public record CustomerCancelOrderRequestDto(
        [StringLength(300)] string? Reason
    );

    public record BulkUpdateFailedItemDto(int OrderId, string Reason);

    public record BulkUpdateStatusResponseDto(
        List<int> UpdatedOrderIds,
        List<BulkUpdateFailedItemDto> Failed,
        string Message
    );
}
