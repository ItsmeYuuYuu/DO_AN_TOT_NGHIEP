using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Auditlogs;
using ECommerceBackend.DTOs.Common;
using Microsoft.AspNetCore.Authorization;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AuditLogsController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public AuditLogsController(ECommerceContext context) => _context = context;

        [HttpGet]
        public async Task<ActionResult<PagedResultDto<AuditlogDto>>> GetAuditLogs(
            [FromQuery] int? userId,
            [FromQuery] string? action,
            [FromQuery] string? tableName,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 20;
            if (pageSize > 10000) pageSize = 10000;

            var query = _context.Auditlogs.Include(a => a.User).AsQueryable();
            query = ApplyFilters(query, userId, action, tableName, fromDate, toDate);

            var totalCount = await query.CountAsync();

            var logs = await query
                .OrderByDescending(a => a.Createdat)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var dtos = logs.Select(a => new AuditlogDto(
                a.Logid,
                a.Userid,
                a.User?.Fullname,
                a.Action,
                a.Tablename,
                a.Recordid,
                a.Createdat
            ));

            return Ok(new PagedResultDto<AuditlogDto>
            {
                Items = dtos,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            });
        }

        [HttpGet("stats")]
        public async Task<ActionResult<AuditlogStatsDto>> GetAuditLogStats(
            [FromQuery] int? userId,
            [FromQuery] string? action,
            [FromQuery] string? tableName,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate)
        {
            var query = _context.Auditlogs.Include(a => a.User).AsQueryable();
            query = ApplyFilters(query, userId, action, tableName, fromDate, toDate);

            var today = DateTime.Today;
            var tomorrow = today.AddDays(1);

            var totalLogs = await query.CountAsync();
            var todayLogs = await query.CountAsync(a => a.Createdat >= today && a.Createdat < tomorrow);
            var createLogs = await query.CountAsync(a =>
                a.Action.StartsWith("Tạo") || a.Action.Contains("Create") || a.Action.Contains("Insert"));
            var updateLogs = await query.CountAsync(a =>
                a.Action.StartsWith("Cập") || a.Action.Contains("Update") || a.Action.Contains("Edit"));
            var deleteLogs = await query.CountAsync(a =>
                a.Action.StartsWith("Xóa") || a.Action.Contains("Delete") || a.Action.Contains("Remove"));

            var topUser = await query
                .Where(a => a.Userid != null)
                .GroupBy(a => a.Userid)
                .Select(g => new { UserId = g.Key, Count = g.Count() })
                .OrderByDescending(g => g.Count)
                .FirstOrDefaultAsync();

            var topUserName = "Chưa có dữ liệu";
            if (topUser?.UserId != null)
            {
                topUserName = await _context.Users
                    .Where(u => u.Userid == topUser.UserId.Value)
                    .Select(u => u.Fullname)
                    .FirstOrDefaultAsync() ?? $"User #{topUser.UserId}";
            }

            var topEntity = await query
                .Where(a => a.Tablename != null && a.Tablename != "")
                .GroupBy(a => a.Tablename)
                .Select(g => new { Entity = g.Key ?? "unknown", Count = g.Count() })
                .OrderByDescending(g => g.Count)
                .FirstOrDefaultAsync();

            return Ok(new AuditlogStatsDto(
                totalLogs,
                todayLogs,
                createLogs,
                updateLogs,
                deleteLogs,
                topUserName,
                topUser?.Count ?? 0,
                topEntity?.Entity ?? "Chưa có dữ liệu",
                topEntity?.Count ?? 0
            ));
        }

        private static IQueryable<Auditlog> ApplyFilters(
            IQueryable<Auditlog> query,
            int? userId,
            string? action,
            string? tableName,
            DateTime? fromDate,
            DateTime? toDate)
        {
            if (userId.HasValue)
            {
                query = query.Where(a => a.Userid == userId.Value);
            }

            if (!string.IsNullOrWhiteSpace(action))
            {
                query = query.Where(a => a.Action.Contains(action));
            }

            if (!string.IsNullOrWhiteSpace(tableName))
            {
                query = query.Where(a => a.Tablename != null && a.Tablename.Contains(tableName));
            }

            if (fromDate.HasValue)
            {
                query = query.Where(a => a.Createdat >= fromDate.Value);
            }

            if (toDate.HasValue)
            {
                var inclusiveToDate = toDate.Value.Date == toDate.Value
                    ? toDate.Value.Date.AddDays(1).AddTicks(-1)
                    : toDate.Value;
                query = query.Where(a => a.Createdat <= inclusiveToDate);
            }

            return query;
        }
    }
}
