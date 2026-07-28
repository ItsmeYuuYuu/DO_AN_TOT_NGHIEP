using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Auditlogs;
using ECommerceBackend.DTOs.Common;
using Microsoft.AspNetCore.Authorization;
using System.Linq;
using System.Threading.Tasks;
using System;
using System.IO;
using System.IO.Compression;
using System.Text;
using ECommerceBackend.Time;

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

            var (today, tomorrow) = VietnamTime.GetUtcDayRange(VietnamTime.Today);

            var totalLogs = await query.CountAsync();
            var todayLogs = await query.CountAsync(a => a.Createdat >= today && a.Createdat < tomorrow);
            var createLogs = await query.CountAsync(a =>
                !a.Action.Contains("[Auth]") &&
                (a.Action.StartsWith("Tạo") || a.Action.Contains("Create") || a.Action.Contains("Insert")));
            var updateLogs = await query.CountAsync(a =>
                !a.Action.Contains("[Auth]") &&
                (a.Action.StartsWith("Cập") || a.Action.Contains("Update") || a.Action.Contains("Edit")));
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

        [HttpGet("export")]
        public async Task<IActionResult> ExportAuditLogs(
            [FromQuery] int? userId,
            [FromQuery] string? action,
            [FromQuery] string? tableName,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate)
        {
            var query = _context.Auditlogs.Include(a => a.User).AsQueryable();
            query = ApplyFilters(query, userId, action, tableName, fromDate, toDate);

            var logs = await query
                .OrderByDescending(a => a.Createdat)
                .Take(10000)
                .Select(a => new AuditlogDto(
                    a.Logid,
                    a.Userid,
                    a.User != null ? a.User.Fullname : null,
                    a.Action,
                    a.Tablename,
                    a.Recordid,
                    a.Createdat
                ))
                .ToListAsync();

            var rows = new List<string[]>
            {
                new[] { "ID", "User ID", "Người dùng", "Thao tác", "Bảng / Đối tượng", "ID đối tượng", "Thời gian" }
            };

            rows.AddRange(logs.Select(log => new[]
            {
                log.Logid.ToString(),
                log.Userid?.ToString() ?? "",
                log.FullName ?? "Hệ thống",
                GetDisplayAction(log.Action),
                log.Tablename ?? "",
                log.Recordid ?? "",
                log.Createdat.HasValue
                    ? VietnamTime.FromUtc(log.Createdat.Value).ToString("dd/MM/yyyy HH:mm")
                    : ""
            }));

            var content = BuildXlsx(rows);
            var fileName = $"audit_logs_{VietnamTime.Now:yyyy-MM-dd}.xlsx";
            return File(
                content,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                fileName);
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
                var actionPattern = $"%{action.Trim()}%";
                query = query.Where(a => EF.Functions.ILike(a.Action, actionPattern));
            }

            if (!string.IsNullOrWhiteSpace(tableName))
            {
                var tablePattern = $"%{tableName.Trim()}%";
                query = query.Where(a =>
                    a.Tablename != null &&
                    EF.Functions.ILike(a.Tablename, tablePattern));
            }

            if (fromDate.HasValue)
            {
                var fromUtc = NormalizeFilterTime(fromDate.Value);
                query = query.Where(a => a.Createdat >= fromUtc);
            }

            if (toDate.HasValue)
            {
                var inclusiveToDate = NormalizeFilterTime(toDate.Value);
                query = query.Where(a => a.Createdat <= inclusiveToDate);
            }

            return query;
        }

        private static DateTime NormalizeFilterTime(DateTime value)
        {
            return value.Kind switch
            {
                DateTimeKind.Utc => value,
                DateTimeKind.Local => value.ToUniversalTime(),
                _ => VietnamTime.ToUtc(value)
            };
        }

        private static string GetDisplayAction(string action)
        {
            var normalized = action.ToLowerInvariant();
            if (normalized.Contains("[auth]") && normalized.Contains("login")) return "Đăng nhập hệ thống";
            if (normalized.Contains("[auth]") && normalized.Contains("logout")) return "Đăng xuất hệ thống";
            if (normalized.Contains("[auth]") && normalized.Contains("register")) return "Đăng ký tài khoản";
            if (normalized.Contains("[auth]") && normalized.Contains("changepassword")) return "Đổi mật khẩu";
            if (normalized.Contains("[auth]") && normalized.Contains("forgotpassword")) return "Yêu cầu khôi phục mật khẩu";
            if (normalized.Contains("[auth]") && normalized.Contains("resetpassword")) return "Đặt lại mật khẩu";
            return action;
        }

        private static byte[] BuildXlsx(IReadOnlyList<string[]> rows)
        {
            using var stream = new MemoryStream();
            using (var archive = new ZipArchive(stream, ZipArchiveMode.Create, true))
            {
                AddZipEntry(archive, "[Content_Types].xml", """
                    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
                      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
                      <Default Extension="xml" ContentType="application/xml"/>
                      <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
                      <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
                      <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
                    </Types>
                    """);

                AddZipEntry(archive, "_rels/.rels", """
                    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
                    </Relationships>
                    """);

                AddZipEntry(archive, "xl/workbook.xml", """
                    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                    <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
                      <sheets>
                        <sheet name="Audit Logs" sheetId="1" r:id="rId1"/>
                      </sheets>
                    </workbook>
                    """);

                AddZipEntry(archive, "xl/_rels/workbook.xml.rels", """
                    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
                      <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
                    </Relationships>
                    """);

                AddZipEntry(archive, "xl/styles.xml", """
                    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                    <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
                      <fonts count="2">
                        <font><sz val="11"/><name val="Calibri"/></font>
                        <font><b/><sz val="11"/><name val="Calibri"/></font>
                      </fonts>
                      <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
                      <borders count="1"><border/></borders>
                      <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
                      <cellXfs count="2">
                        <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
                        <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/>
                      </cellXfs>
                    </styleSheet>
                    """);

                AddZipEntry(archive, "xl/worksheets/sheet1.xml", BuildWorksheetXml(rows));
            }

            return stream.ToArray();
        }

        private static string BuildWorksheetXml(IReadOnlyList<string[]> rows)
        {
            var builder = new StringBuilder();
            builder.Append("""
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
                  <cols>
                    <col min="1" max="1" width="10" customWidth="1"/>
                    <col min="2" max="2" width="10" customWidth="1"/>
                    <col min="3" max="3" width="28" customWidth="1"/>
                    <col min="4" max="4" width="46" customWidth="1"/>
                    <col min="5" max="5" width="24" customWidth="1"/>
                    <col min="6" max="6" width="14" customWidth="1"/>
                    <col min="7" max="7" width="20" customWidth="1"/>
                  </cols>
                  <sheetData>
                """);

            for (var rowIndex = 0; rowIndex < rows.Count; rowIndex++)
            {
                var excelRow = rowIndex + 1;
                builder.Append($"""<row r="{excelRow}">""");
                var row = rows[rowIndex];
                for (var columnIndex = 0; columnIndex < row.Length; columnIndex++)
                {
                    var cellReference = $"{GetColumnName(columnIndex + 1)}{excelRow}";
                    var style = rowIndex == 0 ? " s=\"1\"" : "";
                    builder.Append($"""<c r="{cellReference}" t="inlineStr"{style}><is><t>{XmlEscape(row[columnIndex])}</t></is></c>""");
                }
                builder.Append("</row>");
            }

            builder.Append("""
                  </sheetData>
                </worksheet>
                """);

            return builder.ToString();
        }

        private static string GetColumnName(int columnNumber)
        {
            var dividend = columnNumber;
            var columnName = "";
            while (dividend > 0)
            {
                var modulo = (dividend - 1) % 26;
                columnName = Convert.ToChar('A' + modulo) + columnName;
                dividend = (dividend - modulo) / 26;
            }

            return columnName;
        }

        private static string XmlEscape(string? value)
        {
            return (value ?? "")
                .Replace("&", "&amp;")
                .Replace("<", "&lt;")
                .Replace(">", "&gt;")
                .Replace("\"", "&quot;")
                .Replace("'", "&apos;");
        }

        private static void AddZipEntry(ZipArchive archive, string name, string content)
        {
            var entry = archive.CreateEntry(name, CompressionLevel.Fastest);
            using var entryStream = entry.Open();
            using var writer = new StreamWriter(entryStream, new UTF8Encoding(false));
            writer.Write(content.Trim());
        }
    }
}
