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

    public record AuditlogStatsDto(
        int TotalLogs,
        int TodayLogs,
        int CreateLogs,
        int UpdateLogs,
        int DeleteLogs,
        string TopUser,
        int TopUserCount,
        string TopEntity,
        int TopEntityCount
    );
}
