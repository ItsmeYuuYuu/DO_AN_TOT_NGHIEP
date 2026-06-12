using System.Text.Json;
using ECommerceBackend.DTOs.Common;
using ECommerceBackend.DTOs.Warranties;
using ECommerceBackend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ECommerceBackend.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Admin,Manager,Warranty,Consultant")]
public class WarrantyClaimsController : ControllerBase
{
    private static readonly HashSet<string> TerminalStatuses =
        new(StringComparer.OrdinalIgnoreCase) { "Returned", "Rejected" };

    private static readonly Dictionary<string, string[]> ValidTransitions =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["Received"] = ["Inspecting", "Rejected"],
            ["Inspecting"] = ["WaitingParts", "Repairing", "Rejected"],
            ["WaitingParts"] = ["Repairing", "Rejected"],
            ["Repairing"] = ["WaitingParts", "Completed"],
            ["Completed"] = ["Returned"]
        };

    private readonly ECommerceContext _context;

    public WarrantyClaimsController(ECommerceContext context)
    {
        _context = context;
    }

    private int? GetCurrentUserId()
    {
        var value = User.FindFirst("userid")?.Value;
        return int.TryParse(value, out var userId) ? userId : null;
    }

    private static IReadOnlyList<string> DeserializeImageUrls(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static WarrantyClaimDto MapToDto(Warrantyclaim claim)
    {
        var inventory = claim.Inventoryitem;
        return new WarrantyClaimDto(
            claim.Claimid,
            claim.Imei,
            claim.Customerid,
            claim.Customer.Fullname,
            claim.Customer.Phone,
            inventory.Variant?.Product?.Productname,
            inventory.Variant?.Sku,
            claim.Assigneduserid,
            claim.Assigneduser?.Fullname,
            claim.Faultdescription,
            claim.Status,
            claim.Coverage,
            DeserializeImageUrls(claim.Imageurls),
            claim.Estimatedcost,
            claim.Finalcost,
            claim.Conclusion,
            claim.Receivedat,
            claim.Completedat,
            claim.Createdat,
            claim.Updatedat,
            claim.Histories
                .OrderByDescending(history => history.Createdat)
                .Select(history => new WarrantyClaimHistoryDto(
                    history.Historyid,
                    history.Userid,
                    history.User?.Fullname,
                    history.Fromstatus,
                    history.Tostatus,
                    history.Note,
                    history.Createdat))
                .ToList());
    }

    private IQueryable<Warrantyclaim> ClaimQuery() =>
        _context.Warrantyclaims
            .Include(claim => claim.Customer)
            .Include(claim => claim.Assigneduser)
            .Include(claim => claim.Inventoryitem)
                .ThenInclude(inventory => inventory.Variant)
                    .ThenInclude(variant => variant!.Product)
            .Include(claim => claim.Histories)
                .ThenInclude(history => history.User);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<WarrantyClaimDto>>> GetClaims(
        [FromQuery] string? status,
        [FromQuery] bool assignedToMe = false)
    {
        var query = ClaimQuery().AsNoTracking();
        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(claim => claim.Status == status.Trim());
        }
        if (assignedToMe)
        {
            var userId = GetCurrentUserId();
            if (!userId.HasValue)
                return Unauthorized(new ApiErrorDto("Không xác định được nhân viên.", null));
            query = query.Where(claim => claim.Assigneduserid == userId.Value);
        }

        var claims = await query
            .OrderByDescending(claim => claim.Updatedat)
            .ToListAsync();
        return Ok(claims.Select(MapToDto));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<WarrantyClaimDto>> GetClaim(int id)
    {
        var claim = await ClaimQuery()
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Claimid == id);
        if (claim == null)
            return NotFound(new ApiErrorDto("Phiếu bảo hành không tồn tại.", null));
        return Ok(MapToDto(claim));
    }

    [HttpGet("employees")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<IEnumerable<object>>> GetWarrantyEmployees()
    {
        var employees = await _context.Users
            .AsNoTracking()
            .Include(user => user.Role)
            .Where(user =>
                user.Isactive == true &&
                user.Role != null &&
                user.Role.Rolename == "Warranty")
            .OrderBy(user => user.Fullname)
            .Select(user => new
            {
                user.Userid,
                user.Fullname,
                Role = user.Role!.Rolename
            })
            .ToListAsync();
        return Ok(employees);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Warranty")]
    public async Task<ActionResult<WarrantyClaimDto>> CreateClaim(
        [FromBody] CreateWarrantyClaimRequestDto dto)
    {
        var imei = dto.Imei.Trim();
        var inventory = await _context.Inventoryitems
            .Include(item => item.Orderitems)
                .ThenInclude(item => item.Order)
                    .ThenInclude(order => order!.Customer)
            .FirstOrDefaultAsync(item => item.Imei == imei);
        if (inventory == null)
            return BadRequest(new ApiErrorDto("Không tìm thấy thiết bị theo IMEI.", null));

        var completedOrder = inventory.Orderitems
            .Select(item => item.Order)
            .Where(order => order != null && order.Orderstatus == "Completed" && order.Customer != null)
            .OrderByDescending(order => order!.Orderdate)
            .FirstOrDefault();
        if (completedOrder?.Customer == null)
            return BadRequest(new ApiErrorDto("IMEI chưa thuộc một đơn hàng đã hoàn tất.", null));

        var hasOpenClaim = await _context.Warrantyclaims.AnyAsync(claim =>
            claim.Imei == imei &&
            claim.Status != "Returned" &&
            claim.Status != "Rejected");
        if (hasOpenClaim)
            return Conflict(new ApiErrorDto("Thiết bị đang có một phiếu bảo hành chưa kết thúc.", null));

        var imageUrls = (dto.Imageurls ?? [])
            .Where(url => !string.IsNullOrWhiteSpace(url))
            .Select(url => url.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(6)
            .ToList();
        if (imageUrls.Any(url => !url.Contains("/uploads/warranties/", StringComparison.OrdinalIgnoreCase)))
            return BadRequest(new ApiErrorDto("Ảnh phiếu bảo hành phải được tải lên từ máy.", null));

        var now = DateTime.UtcNow;
        var currentUserId = GetCurrentUserId();
        var isWarrantyEmployee = User.IsInRole("Warranty");
        var coverage = inventory.Warrantyenddate.HasValue && inventory.Warrantyenddate.Value >= now
            ? "InWarranty"
            : "OutOfWarranty";
        var claim = new Warrantyclaim
        {
            Imei = imei,
            Customerid = completedOrder.Customer.Customerid,
            Assigneduserid = isWarrantyEmployee ? currentUserId : null,
            Faultdescription = dto.Faultdescription.Trim(),
            Status = "Received",
            Coverage = coverage,
            Imageurls = JsonSerializer.Serialize(imageUrls),
            Receivedat = now,
            Createdat = now,
            Updatedat = now
        };
        claim.Histories.Add(new Warrantyclaimhistory
        {
            Userid = currentUserId,
            Tostatus = "Received",
            Note = isWarrantyEmployee
                ? "Tiếp nhận thiết bị và tự nhận xử lý."
                : "Tiếp nhận thiết bị bảo hành.",
            Createdat = now
        });

        inventory.Warrantystatus = "InService";
        _context.Warrantyclaims.Add(claim);
        await _context.SaveChangesAsync();

        var created = await ClaimQuery()
            .AsNoTracking()
            .FirstAsync(item => item.Claimid == claim.Claimid);
        return CreatedAtAction(nameof(GetClaim), new { id = claim.Claimid }, MapToDto(created));
    }

    [HttpPost("{id:int}/claim")]
    [Authorize(Roles = "Warranty")]
    public async Task<ActionResult<WarrantyClaimDto>> ClaimForCurrentEmployee(int id)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue)
            return Unauthorized(new ApiErrorDto("Không xác định được nhân viên.", null));

        var claim = await _context.Warrantyclaims.FirstOrDefaultAsync(item => item.Claimid == id);
        if (claim == null)
            return NotFound(new ApiErrorDto("Phiếu bảo hành không tồn tại.", null));
        if (TerminalStatuses.Contains(claim.Status))
            return Conflict(new ApiErrorDto("Phiếu bảo hành đã kết thúc.", null));
        if (claim.Assigneduserid.HasValue && claim.Assigneduserid != userId)
            return Conflict(new ApiErrorDto("Phiếu đã có nhân viên khác phụ trách.", null));

        claim.Assigneduserid = userId;
        claim.Updatedat = DateTime.UtcNow;
        _context.Warrantyclaimhistories.Add(new Warrantyclaimhistory
        {
            Claimid = claim.Claimid,
            Userid = userId,
            Fromstatus = claim.Status,
            Tostatus = claim.Status,
            Note = "Nhân viên nhận phụ trách phiếu.",
            Createdat = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        var updated = await ClaimQuery().AsNoTracking()
            .FirstAsync(item => item.Claimid == id);
        return Ok(MapToDto(updated));
    }

    [HttpPatch("{id:int}/assign")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<WarrantyClaimDto>> Assign(
        int id,
        [FromBody] AssignWarrantyClaimRequestDto dto)
    {
        var claim = await _context.Warrantyclaims.FirstOrDefaultAsync(item => item.Claimid == id);
        if (claim == null)
            return NotFound(new ApiErrorDto("Phiếu bảo hành không tồn tại.", null));
        if (TerminalStatuses.Contains(claim.Status))
            return Conflict(new ApiErrorDto("Phiếu bảo hành đã kết thúc.", null));

        var employee = await _context.Users
            .Include(user => user.Role)
            .FirstOrDefaultAsync(user => user.Userid == dto.Assigneduserid);
        if (employee?.Isactive != true || employee.Role?.Rolename != "Warranty")
            return BadRequest(new ApiErrorDto("Nhân viên được chọn không thuộc bộ phận bảo hành.", null));

        var actorId = GetCurrentUserId();
        claim.Assigneduserid = employee.Userid;
        claim.Updatedat = DateTime.UtcNow;
        _context.Warrantyclaimhistories.Add(new Warrantyclaimhistory
        {
            Claimid = claim.Claimid,
            Userid = actorId,
            Fromstatus = claim.Status,
            Tostatus = claim.Status,
            Note = string.IsNullOrWhiteSpace(dto.Note)
                ? $"Phân công cho {employee.Fullname}."
                : dto.Note.Trim(),
            Createdat = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        var updated = await ClaimQuery().AsNoTracking()
            .FirstAsync(item => item.Claimid == id);
        return Ok(MapToDto(updated));
    }

    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = "Admin,Manager,Warranty")]
    public async Task<ActionResult<WarrantyClaimDto>> UpdateStatus(
        int id,
        [FromBody] UpdateWarrantyClaimStatusRequestDto dto)
    {
        var claim = await _context.Warrantyclaims
            .Include(item => item.Inventoryitem)
            .FirstOrDefaultAsync(item => item.Claimid == id);
        if (claim == null)
            return NotFound(new ApiErrorDto("Phiếu bảo hành không tồn tại.", null));

        var actorId = GetCurrentUserId();
        if (User.IsInRole("Warranty") && claim.Assigneduserid != actorId)
            return StatusCode(403, new ApiErrorDto("Bạn phải nhận phiếu trước khi cập nhật.", null));

        var newStatus = dto.Status.Trim();
        if (!ValidTransitions.TryGetValue(claim.Status, out var allowed) ||
            !allowed.Contains(newStatus, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new ApiErrorDto(
                $"Không thể chuyển phiếu từ {claim.Status} sang {newStatus}.",
                null));
        }
        if (newStatus == "Completed" && string.IsNullOrWhiteSpace(dto.Conclusion))
            return BadRequest(new ApiErrorDto("Cần nhập kết luận sửa chữa trước khi hoàn tất.", null));
        if (dto.Estimatedcost < 0 || dto.Finalcost < 0)
            return BadRequest(new ApiErrorDto("Chi phí không được là số âm.", null));

        var previousStatus = claim.Status;
        claim.Status = newStatus;
        claim.Estimatedcost = dto.Estimatedcost ?? claim.Estimatedcost;
        claim.Finalcost = dto.Finalcost ?? claim.Finalcost;
        claim.Conclusion = string.IsNullOrWhiteSpace(dto.Conclusion)
            ? claim.Conclusion
            : dto.Conclusion.Trim();
        claim.Updatedat = DateTime.UtcNow;

        if (newStatus is "Completed" or "Rejected")
        {
            claim.Completedat = DateTime.UtcNow;
        }
        if (newStatus is "Returned" or "Rejected")
        {
            claim.Inventoryitem.Warrantystatus =
                claim.Inventoryitem.Warrantyenddate.HasValue &&
                claim.Inventoryitem.Warrantyenddate.Value >= DateTime.UtcNow
                    ? "Active"
                    : "Expired";
        }

        _context.Warrantyclaimhistories.Add(new Warrantyclaimhistory
        {
            Claimid = claim.Claimid,
            Userid = actorId,
            Fromstatus = previousStatus,
            Tostatus = newStatus,
            Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim(),
            Createdat = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        var updated = await ClaimQuery().AsNoTracking()
            .FirstAsync(item => item.Claimid == id);
        return Ok(MapToDto(updated));
    }
}
