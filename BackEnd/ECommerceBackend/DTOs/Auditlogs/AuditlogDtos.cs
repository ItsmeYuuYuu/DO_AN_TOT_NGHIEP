using System;

namespace ECommerceBackend.DTOs.Auditlogs
{
    public record AuditlogDto(
        int Logid,
        int? Userid,
        string? FullName,
        string Action,
        string? Tablename,
        string? Recordid,
        DateTime? Createdat
    );
}
