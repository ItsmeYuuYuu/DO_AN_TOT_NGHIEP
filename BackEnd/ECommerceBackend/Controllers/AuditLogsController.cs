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

            var query = _context.Auditlogs.Include(a => a.User).AsQueryable();

            if (userId.HasValue)
            {
                query = query.Where(a => a.Userid == userId.Value);
            }

            if (!string.IsNullOrEmpty(action))
            {
                query = query.Where(a => a.Action.Contains(action));
            }

            if (!string.IsNullOrEmpty(tableName))
            {
                query = query.Where(a => a.Tablename != null && a.Tablename.Contains(tableName));
            }

            if (fromDate.HasValue)
            {
                query = query.Where(a => a.Createdat >= fromDate.Value);
            }

            if (toDate.HasValue)
            {
                query = query.Where(a => a.Createdat <= toDate.Value);
            }

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
    }
}
