namespace ECommerceBackend.DTOs.Returns;

public record CreateReturnRequestDto(
    int Orderid,
    string Requesttype,
    string Reasoncategory,
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
    string Inspectiongrade,
    string Faultresponsibility,
    bool Missingbox,
    int Missingaccessorycount,
    string? Replacementimei,
    decimal? Refundamount = null);

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

public record ConfirmRefundAssessmentDto(bool Accepted, string? Note);

public record ReinspectRefundAssessmentDto(string Note);

public record OverrideRefundAssessmentDto(decimal Approvedrefundamount, string Note);

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
    decimal Refundamount,
    decimal Originalpaidamount,
    string? Inspectiongrade,
    string? Faultresponsibility,
    decimal Deductionamount,
    int? Resalevariantid);

public record RefundCalculationItemDto(
    int Orderitemid,
    string Imei,
    decimal Originalpaidamount,
    string Inspectiongrade,
    string Faultresponsibility,
    decimal Timedeductionrate,
    decimal Conditiondeductionrate,
    decimal Missingboxrate,
    decimal Missingaccessoryrate,
    decimal Totaldeductionrate,
    decimal Deductionamount,
    decimal Refundamount);

public record RefundCalculationDto(
    string Policyversion,
    DateTime Deliverydate,
    int Dayssincedelivery,
    decimal Totaldeductionamount,
    IReadOnlyList<RefundCalculationItemDto> Items,
    bool Manageroverride = false,
    string? Overridenote = null);

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
    string Reasoncategory,
    string Reason,
    string? Description,
    string Status,
    IReadOnlyList<string> Imageurls,
    string? Reviewnote,
    string? Resolution,
    decimal Requestedrefundamount,
    decimal? Approvedrefundamount,
    decimal? Refundamount,
    string Refundstatus,
    RefundDestinationDto? Refunddestination,
    string Policyversion,
    RefundCalculationDto? Refundcalculation,
    DateTime? Requestedat,
    DateTime? Reviewedat,
    DateTime? Receivedat,
    DateTime? Completedat,
    DateTime? Updatedat,
    IReadOnlyList<ReturnItemDto> Items,
    IReadOnlyList<ReturnRequestHistoryDto> Histories,
    IReadOnlyList<RefundTransactionDto> Refundtransactions);
