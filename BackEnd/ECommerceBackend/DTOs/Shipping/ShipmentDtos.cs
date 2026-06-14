using System.ComponentModel.DataAnnotations;

namespace ECommerceBackend.DTOs.Shipping;

public record ShipmentHistoryDto(
    int Historyid,
    int? Userid,
    string? User,
    string? Fromstatus,
    string Tostatus,
    string? Note,
    DateTime? Createdat);

public record ShipmentDto(
    int Shipmentid,
    int Orderid,
    string Carrier,
    string Trackingcode,
    decimal Shippingfee,
    string Status,
    DateTime? Estimateddeliveryat,
    int Deliveryattempts,
    string? Shippingname,
    string? Shippingphone,
    string? Shippingaddress,
    string? Paymentmethod,
    string? Paymentstatus,
    decimal Finalamount,
    DateTime? Createdat,
    DateTime? Updatedat,
    DateTime? Pickedupat,
    DateTime? Deliveredat,
    DateTime? Returnedat,
    List<ShipmentHistoryDto> Histories);

public record UpdateShipmentStatusDto(
    [Required] string Status,
    string? Note = null);
