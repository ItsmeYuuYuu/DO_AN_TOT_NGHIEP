using System.Text.Json;
using ECommerceBackend.DTOs.Common;
using ECommerceBackend.DTOs.Orders;
using ECommerceBackend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ECommerceBackend.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class OrderAssignmentsController : ControllerBase
{
    private const string Sales = "Sales";
    private const string Warehouse = "Warehouse";
    private const string InternalCarrier = "STORE_DELIVERY";
    private static readonly HashSet<string> Carriers =
        new(["GHN", "GHTK", "VIETTELPOST", "J&T", InternalCarrier], StringComparer.OrdinalIgnoreCase);
    private readonly ECommerceContext _context;

    private sealed class AssignmentMetadata
    {
        public string Department { get; set; } = "";
        public int? Assigneduserid { get; set; }
        public int? Assignedbyuserid { get; set; }
        public DateTime? Assignedat { get; set; }
        public DateTime? Completedat { get; set; }
    }

    public OrderAssignmentsController(ECommerceContext context) => _context = context;

    private int? CurrentUserId() =>
        int.TryParse(User.FindFirst("userid")?.Value, out var value) ? value : null;

    private static string NormalizeDepartment(string? value) =>
        value?.Trim().Equals(Sales, StringComparison.OrdinalIgnoreCase) == true ? Sales :
        value?.Trim().Equals(Warehouse, StringComparison.OrdinalIgnoreCase) == true ? Warehouse : "";

    private bool CanWork(string department) =>
        User.IsInRole("Admin") || User.IsInRole("Manager") || User.IsInRole(department);

    private static AssignmentMetadata? ReadMetadata(Statuslog log)
    {
        if (string.IsNullOrWhiteSpace(log.Metadata)) return null;
        try
        {
            return JsonSerializer.Deserialize<AssignmentMetadata>(log.Metadata,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch (JsonException) { return null; }
    }

    private async Task<OrderAssignmentDto?> GetAssignmentAsync(int orderId, string department)
    {
        var logs = await _context.Statuslogs.AsNoTracking()
            .Where(log => log.Entitytype == "Order" && log.Entityid == orderId && log.Actiontype == "Assignment")
            .OrderByDescending(log => log.Createdat)
            .ThenByDescending(log => log.Logid)
            .ToListAsync();
        var match = logs.Select(log => new { log, metadata = ReadMetadata(log) })
            .FirstOrDefault(item => item.metadata?.Department == department);
        if (match?.metadata == null) return null;

        var userIds = new[] { match.metadata.Assigneduserid, match.metadata.Assignedbyuserid }
            .Where(id => id.HasValue).Select(id => id!.Value).Distinct().ToList();
        var names = await _context.Users.AsNoTracking()
            .Where(user => userIds.Contains(user.Userid))
            .ToDictionaryAsync(user => user.Userid, user => user.Fullname);
        return new OrderAssignmentDto(
            match.log.Logid, orderId, department,
            match.metadata.Assigneduserid,
            match.metadata.Assigneduserid.HasValue ? names.GetValueOrDefault(match.metadata.Assigneduserid.Value) : null,
            match.metadata.Assignedbyuserid,
            match.metadata.Assignedbyuserid.HasValue ? names.GetValueOrDefault(match.metadata.Assignedbyuserid.Value) : null,
            match.log.Tostatus,
            match.metadata.Assignedat,
            match.metadata.Completedat,
            match.log.Note);
    }

    private async Task<OrderWorkflowItemDto> MapAsync(Order order, string department)
    {
        var devices = order.Orderitems.Where(item => !string.IsNullOrWhiteSpace(item.Imei))
            .Select(item => new OrderWorkflowDeviceDto(
                item.Orderitemid, item.Imei!,
                item.ImeiNavigation?.Variant?.Product?.Productname,
                item.ImeiNavigation?.Variant?.Sku,
                item.ImeiNavigation?.Status)).ToList();
        return new OrderWorkflowItemDto(
            order.Orderid, order.Orderdate, order.Orderstatus, order.Paymentmethod,
            order.Paymentstatus, order.Finalamount, order.Paidamount ?? 0,
            order.Checkouttype, order.Shippingname, order.Shippingphone,
            order.Shippingaddress, order.Orderitems.Count, devices,
            await GetAssignmentAsync(order.Orderid, department));
    }

    private void AddAssignmentLog(
        int orderId, string department, string status,
        int? assignedUserId, int? assignedByUserId,
        DateTime? assignedAt, DateTime? completedAt, string? note)
    {
        _context.Statuslogs.Add(new Statuslog
        {
            Entitytype = "Order",
            Entityid = orderId,
            Actiontype = "Assignment",
            Fromstatus = status,
            Tostatus = status,
            Userid = assignedByUserId,
            Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim(),
            Metadata = JsonSerializer.Serialize(new AssignmentMetadata
            {
                Department = department,
                Assigneduserid = assignedUserId,
                Assignedbyuserid = assignedByUserId,
                Assignedat = assignedAt,
                Completedat = completedAt
            }),
            Createdat = DateTime.UtcNow
        });
    }

    [HttpGet("queue/{department}")]
    public async Task<ActionResult<IEnumerable<OrderWorkflowItemDto>>> GetQueue(string department)
    {
        department = NormalizeDepartment(department);
        if (department.Length == 0) return BadRequest(new ApiErrorDto("Bộ phận không hợp lệ.", null));
        if (!CanWork(department)) return Forbid();

        var query = _context.Orders.AsNoTracking()
            .Include(order => order.Orderitems)
                .ThenInclude(item => item.ImeiNavigation)
                    .ThenInclude(item => item!.Variant)
                        .ThenInclude(item => item!.Product)
            .AsQueryable();
        query = department == Sales
            ? query.Where(order => order.Orderstatus == "Pending")
            : query.Where(order => order.Orderstatus == "Processing");
        var orders = await query.OrderBy(order => order.Orderdate).ToListAsync();
        var result = new List<OrderWorkflowItemDto>();
        foreach (var order in orders) result.Add(await MapAsync(order, department));
        return Ok(result);
    }

    [HttpGet("employees/{department}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<IEnumerable<AssignmentEmployeeDto>>> GetEmployees(string department)
    {
        department = NormalizeDepartment(department);
        if (department.Length == 0) return BadRequest(new ApiErrorDto("Bộ phận không hợp lệ.", null));
        return Ok(await _context.Users.AsNoTracking().Include(user => user.Role)
            .Where(user => user.Isactive == true && user.Role != null && user.Role.Rolename == department)
            .OrderBy(user => user.Fullname)
            .Select(user => new AssignmentEmployeeDto(user.Userid, user.Fullname, user.Role!.Rolename))
            .ToListAsync());
    }

    [HttpPost("{orderId:int}/claim")]
    public async Task<ActionResult<OrderAssignmentDto>> Claim(int orderId, ClaimOrderRequestDto dto)
    {
        var department = NormalizeDepartment(dto.Department);
        var userId = CurrentUserId();
        if (department.Length == 0) return BadRequest(new ApiErrorDto("Bộ phận không hợp lệ.", null));
        if (!CanWork(department)) return Forbid();
        if (!userId.HasValue) return Unauthorized();
        var order = await _context.Orders.FindAsync(orderId);
        if (order == null) return NotFound(new ApiErrorDto("Đơn hàng không tồn tại.", null));
        if (department == Sales && order.Orderstatus != "Pending" || department == Warehouse && order.Orderstatus != "Processing")
            return Conflict(new ApiErrorDto("Đơn hàng không còn trong hàng đợi của bộ phận này.", null));

        var current = await GetAssignmentAsync(orderId, department);
        if (current?.Status == "Assigned" && current.Assigneduserid != userId)
            return Conflict(new ApiErrorDto("Đơn hàng đã có nhân viên khác phụ trách.", null));
        AddAssignmentLog(orderId, department, "Assigned", userId, userId,
            current?.Assignedat ?? DateTime.UtcNow, null, dto.Note);
        await _context.SaveChangesAsync();
        return Ok((await GetAssignmentAsync(orderId, department))!);
    }

    [HttpPost("{orderId:int}/assign")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<OrderAssignmentDto>> Assign(int orderId, AssignOrderRequestDto dto)
    {
        var department = NormalizeDepartment(dto.Department);
        if (department.Length == 0) return BadRequest(new ApiErrorDto("Bộ phận không hợp lệ.", null));
        var target = await _context.Users.Include(user => user.Role)
            .FirstOrDefaultAsync(user => user.Userid == dto.Assigneduserid && user.Isactive == true);
        if (target?.Role?.Rolename != department)
            return BadRequest(new ApiErrorDto("Nhân viên không thuộc bộ phận được phân công.", null));
        if (!await _context.Orders.AnyAsync(order => order.Orderid == orderId))
            return NotFound(new ApiErrorDto("Đơn hàng không tồn tại.", null));
        AddAssignmentLog(orderId, department, "Assigned", target.Userid, CurrentUserId(), DateTime.UtcNow, null, dto.Note);
        await _context.SaveChangesAsync();
        return Ok((await GetAssignmentAsync(orderId, department))!);
    }

    [HttpPost("{orderId:int}/handoff-to-warehouse")]
    [Authorize(Roles = "Admin,Manager,Sales")]
    public async Task<ActionResult<OrderWorkflowItemDto>> HandoffToWarehouse(int orderId, HandoffOrderRequestDto dto)
    {
        var order = await _context.Orders.Include(item => item.Orderitems)
            .ThenInclude(item => item.ImeiNavigation)!.ThenInclude(item => item!.Variant)!.ThenInclude(item => item!.Product)
            .FirstOrDefaultAsync(item => item.Orderid == orderId);
        if (order == null) return NotFound(new ApiErrorDto("Đơn hàng không tồn tại.", null));
        if (order.Orderstatus != "Pending") return Conflict(new ApiErrorDto("Chỉ đơn chờ duyệt mới có thể bàn giao.", null));
        var paymentReady = order.Paymentmethod == "COD"
            ? order.Paymentstatus == "CODPending"
            : order.Paymentstatus is "DepositPaid" or "Paid";
        if (!paymentReady) return BadRequest(new ApiErrorDto("Đơn hàng chưa đủ điều kiện thanh toán.", null));

        var now = DateTime.UtcNow;
        AddAssignmentLog(orderId, Sales, "Completed", CurrentUserId(), CurrentUserId(), now, now, dto.Note);
        AddAssignmentLog(orderId, Warehouse, "Pending", null, CurrentUserId(), null, null, dto.Note);
        order.Orderstatus = "Processing";
        await _context.SaveChangesAsync();
        return Ok(await MapAsync(order, Warehouse));
    }

    [HttpPost("{orderId:int}/mark-shipped")]
    [Authorize(Roles = "Admin,Manager,Warehouse")]
    public async Task<ActionResult<OrderWorkflowItemDto>> MarkShipped(int orderId, MarkOrderShippedRequestDto dto)
    {
        var order = await _context.Orders.Include(item => item.Orderitems)
            .ThenInclude(item => item.ImeiNavigation)!.ThenInclude(item => item!.Variant)!.ThenInclude(item => item!.Product)
            .FirstOrDefaultAsync(item => item.Orderid == orderId);
        if (order == null) return NotFound(new ApiErrorDto("Đơn hàng không tồn tại.", null));
        if (order.Orderstatus != "Processing") return Conflict(new ApiErrorDto("Đơn hàng không ở trạng thái đang xử lý.", null));
        if (await _context.Shipments.AnyAsync(item => item.Orderid == orderId))
            return Conflict(new ApiErrorDto("Đơn hàng đã có vận đơn.", null));
        var carrier = dto.Carrier.Trim().ToUpperInvariant();
        if (!Carriers.Contains(carrier)) return BadRequest(new ApiErrorDto("Đơn vị vận chuyển không hợp lệ.", null));
        if (order.Checkouttype == "Guest" && carrier != InternalCarrier)
            return BadRequest(new ApiErrorDto("Đơn khách vãng lai phải do cửa hàng giao nội thành TP.HCM.", null));

        var expected = order.Orderitems.Where(item => item.Imei != null).Select(item => item.Imei!).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var confirmed = dto.Imeis.Where(item => !string.IsNullOrWhiteSpace(item)).Select(item => item.Trim()).ToHashSet(StringComparer.OrdinalIgnoreCase);
        if (expected.Count == 0 || !expected.SetEquals(confirmed))
            return BadRequest(new ApiErrorDto("Danh sách IMEI xác nhận không khớp với đơn hàng.", null));
        foreach (var inventory in order.Orderitems.Select(item => item.ImeiNavigation).Where(item => item != null).Cast<Inventoryitem>())
        {
            var previous = inventory.Status;
            inventory.Status = "Shipping";
            _context.Inventorytransactions.Add(new Inventorytransaction
            {
                Imei = inventory.Imei, Orderid = orderId, Userid = CurrentUserId(),
                Transactiontype = "Ship", Fromstatus = previous, Tostatus = "Shipping",
                Note = dto.Note, Createdat = DateTime.UtcNow
            });
        }
        var now = DateTime.UtcNow;
        order.Orderstatus = "Shipped";
        var shipment = new Shipment
        {
            Orderid = orderId, Carrier = carrier,
            Trackingcode = $"{carrier.Replace("&", "")}-DEMO-{now:yyyyMMdd}-{orderId:D6}",
            Shippingfee = dto.Shippingfee, Status = "AwaitingPickup",
            Estimateddeliveryat = dto.Estimateddeliveryat, Createdbyuserid = CurrentUserId(),
            Createdat = now, Updatedat = now
        };
        _context.Shipments.Add(shipment);
        AddAssignmentLog(orderId, Warehouse, "Completed", CurrentUserId(), CurrentUserId(), now, now, dto.Note);
        await _context.SaveChangesAsync();
        _context.Statuslogs.Add(new Statuslog
        {
            Entitytype = "Shipment", Entityid = shipment.Shipmentid, Actiontype = "StatusChanged",
            Fromstatus = "Created", Tostatus = "AwaitingPickup", Userid = CurrentUserId(),
            Note = dto.Note, Createdat = now
        });
        await _context.SaveChangesAsync();
        return Ok(await MapAsync(order, Warehouse));
    }
}
