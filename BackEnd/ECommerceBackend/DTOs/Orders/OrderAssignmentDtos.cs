using System.ComponentModel.DataAnnotations;

namespace ECommerceBackend.DTOs.Orders;

public record OrderAssignmentDto(
    int Assignmentid,
    int Orderid,
    string Department,
    int? Assigneduserid,
    string? Assigneduser,
    int? Assignedbyuserid,
    string? Assignedbyuser,
    string Status,
    DateTime? Assignedat,
    DateTime? Completedat,
    string? Note
);

public record OrderWorkflowItemDto(
    int Orderid,
    DateTime? Orderdate,
    string? Orderstatus,
    string? Paymentmethod,
    string? Paymentstatus,
    decimal Finalamount,
    decimal Paidamount,
    string? Checkouttype,
    string? Shippingname,
    string? Shippingphone,
    string? Shippingaddress,
    decimal Shippingfee,
    int Itemcount,
    List<OrderWorkflowDeviceDto> Devices,
    OrderAssignmentDto? Assignment
);

public record OrderWorkflowDeviceDto(
    int Orderitemid,
    string Imei,
    string? Productname,
    string? Variantsku,
    string? Inventorystatus
);

public record ClaimOrderRequestDto(
    [Required] string Department,
    string? Note = null
);

public record AssignOrderRequestDto(
    [Required] string Department,
    [Required] int Assigneduserid,
    string? Note = null
);

public record HandoffOrderRequestDto(string? Note = null);

public record MarkOrderShippedRequestDto(
    [Required, MinLength(1)] List<string> Imeis,
    string? Note = null,
    string Carrier = "GHN",
    [Range(0, 10000000)] decimal Shippingfee = 0,
    DateTime? Estimateddeliveryat = null
);

public record AssignmentEmployeeDto(
    int Userid,
    string Fullname,
    string Rolename
);
