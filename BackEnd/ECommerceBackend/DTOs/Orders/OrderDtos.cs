using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using ECommerceBackend.DTOs.Common;

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
        string? Packagename
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
        CustomerLiteDto? Customer,
        List<OrderItemDto>? Orderitems
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
            CustomerLiteDto? Customer,
            List<OrderItemDto>? Orderitems
        ) : base(Orderid, Customerid, Orderdate, Orderstatus, Totalamount, Discountamount, Finalamount, Paymentmethod, Customer, Orderitems) { }
    }

    public record CreateOrderItemRequestDto(
        [Required] int Variantid, 
        [Range(1, 1000, ErrorMessage = "Số lượng phải từ 1 đến 1000")] int Quantity,
        int? Packageid = null
    );

    public record CreateOrderRequestDto(
        int? Userid,
        [Required(ErrorMessage = "Phương thức thanh toán là bắt buộc")] string? Paymentmethod,
        string? Vouchercode,
        [Required, MinLength(1, ErrorMessage = "Đơn hàng phải có ít nhất 1 sản phẩm")] List<CreateOrderItemRequestDto> Items,
        string? Shippingaddress,
        string? Note
    );

    public record UpdateOrderRequestDto(string? Paymentmethod, string? Vouchercode);

    public record UpdateOrderStatusRequestDto(
        [Required(ErrorMessage = "Trạng thái là bắt buộc")] string Status
    );

    public record UpdateOrderStatusResponseDto(int Orderid, string Orderstatus);

    /// <summary>Safe limited DTO for public order lookup — no IMEI, no internal fields.</summary>
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
}
