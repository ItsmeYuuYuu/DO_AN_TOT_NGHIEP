using System.ComponentModel.DataAnnotations;

namespace ECommerceBackend.DTOs.Warranties;

public record WarrantyClaimHistoryDto(
    int Historyid,
    int? Userid,
    string? Username,
    string? Fromstatus,
    string Tostatus,
    string? Note,
    DateTime Createdat);

public record WarrantyClaimDto(
    int Claimid,
    string Imei,
    int Customerid,
    string Customername,
    string Customerphone,
    string? Productname,
    string? Variantsku,
    int? Assigneduserid,
    string? Assignedusername,
    string Faultdescription,
    string Status,
    string Coverage,
    IReadOnlyList<string> Imageurls,
    decimal? Estimatedcost,
    decimal? Finalcost,
    string? Conclusion,
    DateTime Receivedat,
    DateTime? Completedat,
    DateTime Createdat,
    DateTime Updatedat,
    IReadOnlyList<WarrantyClaimHistoryDto> Histories);

public record CreateWarrantyClaimRequestDto(
    [Required, MaxLength(50)] string Imei,
    [Required, MaxLength(2000)] string Faultdescription,
    IReadOnlyList<string>? Imageurls);

public record AssignWarrantyClaimRequestDto(
    [Required] int Assigneduserid,
    [MaxLength(1000)] string? Note);

public record UpdateWarrantyClaimStatusRequestDto(
    [Required, MaxLength(30)] string Status,
    decimal? Estimatedcost,
    decimal? Finalcost,
    [MaxLength(2000)] string? Conclusion,
    [MaxLength(1000)] string? Note);
