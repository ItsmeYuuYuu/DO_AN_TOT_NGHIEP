namespace ECommerceBackend.DTOs.Returns;

public record CreateReturnRequestDto(
    int Orderid,
    string Requesttype,
    string Reason,
    string? Description,
    IReadOnlyList<int> Orderitemids,
    IReadOnlyList<string>? Imageurls,
    RefundDestinationDto? Refunddestination);

public record RefundDestinationDto(
    string Method,
    string? Bankname,
    string? Accountnumber,
    string? Accountholder,
    bool Confirmed);

public record ReviewReturnRequestDto(bool Approved, string? Note);

public record AssignReturnRequestDto(int Assigneduserid, string? Note);

public record ReceiveReturnItemDto(
    int Returnitemid,
    string Condition,
    string Disposition,
    string? Replacementimei,
    decimal? Refundamount);

public record ReceiveReturnRequestDto(
    IReadOnlyList<ReceiveReturnItemDto> Items,
    string? Resolution,
    string? Note);

public record ProcessRefundDto(
    decimal Amount,
    string Provider,
    string? Transactionref,
    string? Note);

public record ConfirmRefundReceiptDto(string? Note);

public record DisputeRefundDto(string Note);

public record ResolveRefundDisputeDto(
    string Outcome,
    string Note);

public record ReturnRequestHistoryDto(
    int Historyid,
    int? Userid,
    string? Userfullname,
    string? Fromstatus,
    string Tostatus,
    string? Note,
    DateTime? Createdat);

public record ReturnItemDto(
    int Returnitemid,
    int Orderitemid,
    string Imei,
    int? Variantid,
    string? Productname,
    string? Sku,
    string? Condition,
    string? Disposition,
    string? Replacementimei,
    decimal Refundamount);

public record RefundTransactionDto(
    int Refundtransactionid,
    decimal Amount,
    string Provider,
    string Status,
    string? Transactionref,
    string? Processedby,
    DateTime? Processedat);

public record ReturnRequestDto(
    int Returnrequestid,
    int Orderid,
    int? Customerid,
    string? Customername,
    string? Customerphone,
    int? Requestedbyuserid,
    int? Assigneduserid,
    string? Assigneduser,
    string Requesttype,
    string Reason,
    string? Description,
    string Status,
    IReadOnlyList<string> Imageurls,
    string? Reviewnote,
    string? Resolution,
    decimal Requestedrefundamount,
    decimal? Refundamount,
    string Refundstatus,
    RefundDestinationDto? Refunddestination,
    DateTime? Requestedat,
    DateTime? Reviewedat,
    DateTime? Receivedat,
    DateTime? Completedat,
    DateTime? Updatedat,
    IReadOnlyList<ReturnItemDto> Items,
    IReadOnlyList<ReturnRequestHistoryDto> Histories,
    IReadOnlyList<RefundTransactionDto> Refundtransactions);
