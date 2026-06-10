namespace ECommerceBackend.DTOs.Inventory;

public record InventoryTransactionDto(
    int Transactionid,
    string Imei,
    int? Orderid,
    int? Userid,
    string? Username,
    string Transactiontype,
    string? Fromstatus,
    string Tostatus,
    string? Note,
    DateTime? Createdat
);
