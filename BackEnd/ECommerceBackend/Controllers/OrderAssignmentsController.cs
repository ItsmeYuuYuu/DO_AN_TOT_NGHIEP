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
    private const string SalesDepartment = "Sales";
    private const string WarehouseDepartment = "Warehouse";
    private readonly ECommerceContext _context;

    public OrderAssignmentsController(ECommerceContext context)
    {
        _context = context;
    }

    private int? GetClaimUserId()
    {
        var value = User.FindFirst("userid")?.Value;
        return int.TryParse(value, out var userId) ? userId : null;
    }

    private static string NormalizeDepartment(string? department)
    {
        var value = (department ?? string.Empty).Trim();
        if (value.Equals(SalesDepartment, StringComparison.OrdinalIgnoreCase)) return SalesDepartment;
        if (value.Equals(WarehouseDepartment, StringComparison.OrdinalIgnoreCase)) return WarehouseDepartment;
        return string.Empty;
    }

    private bool CanWorkDepartment(string department) =>
        User.IsInRole("Admin") ||
        User.IsInRole("Manager") ||
        department == SalesDepartment && User.IsInRole("Sales") ||
        department == WarehouseDepartment && User.IsInRole("Warehouse");

    private static bool IsPaymentReady(Order order) =>
        order.Paymentmethod == "COD"
            ? order.Checkouttype == "Registered" && order.Paymentstatus == "CODPending"
            : order.Paymentstatus is "DepositPaid" or "Paid";

    private static OrderAssignmentDto MapAssignment(Orderassignment assignment) => new(
        assignment.Assignmentid,
        assignment.Orderid,
        assignment.Department,
        assignment.Assigneduserid,
        assignment.Assigneduser?.Fullname,
        assignment.Assignedbyuserid,
        assignment.Assignedbyuser?.Fullname,
        assignment.Status,
        assignment.Assignedat,
        assignment.Completedat,
        assignment.Note);

    private static OrderWorkflowItemDto MapWorkflow(Order order, string department)
    {
        var assignment = order.Orderassignments
            .FirstOrDefault(item => item.Department == department);
        var devices = order.Orderitems
            .Where(item => !string.IsNullOrWhiteSpace(item.Imei))
            .Select(item => new OrderWorkflowDeviceDto(
                item.Orderitemid,
                item.Imei!,
                item.ImeiNavigation?.Variant?.Product?.Productname,
                item.ImeiNavigation?.Variant?.Sku,
                item.ImeiNavigation?.Status))
            .ToList();
        return new OrderWorkflowItemDto(
            order.Orderid,
            order.Orderdate,
            order.Orderstatus,
            order.Paymentmethod,
            order.Paymentstatus,
            order.Finalamount,
            order.Paidamount ?? 0,
            order.Checkouttype,
            order.Shippingname,
            order.Shippingphone,
            order.Shippingaddress,
            order.Orderitems.Count,
            devices,
            assignment == null ? null : MapAssignment(assignment));
    }

    [HttpGet("queue/{department}")]
    public async Task<ActionResult<IEnumerable<OrderWorkflowItemDto>>> GetQueue(string department)
    {
        department = NormalizeDepartment(department);
        if (department.Length == 0)
            return BadRequest(new ApiErrorDto("Bo phan khong hop le.", null));
        if (!CanWorkDepartment(department)) return Forbid();

        var query = _context.Orders
            .AsNoTracking()
            .Include(order => order.Orderitems)
                .ThenInclude(item => item.ImeiNavigation)
                    .ThenInclude(item => item!.Variant)
                        .ThenInclude(item => item!.Product)
            .Include(order => order.Orderassignments.Where(item => item.Department == department))
                .ThenInclude(item => item.Assigneduser)
            .Include(order => order.Orderassignments.Where(item => item.Department == department))
                .ThenInclude(item => item.Assignedbyuser)
            .AsQueryable();

        query = department == SalesDepartment
            ? query.Where(order => order.Orderstatus == "Pending")
            : query.Where(order =>
                order.Orderstatus == "Processing" &&
                order.Orderassignments.Any(item => item.Department == WarehouseDepartment));

        var orders = await query
            .OrderBy(order => order.Orderdate)
            .ToListAsync();
        return Ok(orders.Select(order => MapWorkflow(order, department)));
    }

    [HttpGet("employees/{department}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<IEnumerable<AssignmentEmployeeDto>>> GetEmployees(string department)
    {
        department = NormalizeDepartment(department);
        if (department.Length == 0)
            return BadRequest(new ApiErrorDto("Bo phan khong hop le.", null));

        var employees = await _context.Users
            .AsNoTracking()
            .Include(user => user.Role)
            .Where(user =>
                user.Isactive == true &&
                user.Role != null &&
                user.Role.Rolename == department)
            .OrderBy(user => user.Fullname)
            .Select(user => new AssignmentEmployeeDto(
                user.Userid,
                user.Fullname,
                user.Role!.Rolename))
            .ToListAsync();
        return Ok(employees);
    }

    [HttpPost("{orderId}/claim")]
    public async Task<ActionResult<OrderAssignmentDto>> Claim(
        int orderId,
        [FromBody] ClaimOrderRequestDto dto)
    {
        var department = NormalizeDepartment(dto.Department);
        if (department.Length == 0)
            return BadRequest(new ApiErrorDto("Bo phan khong hop le.", null));
        if (!CanWorkDepartment(department)) return Forbid();

        var userId = GetClaimUserId();
        if (!userId.HasValue)
            return Unauthorized(new ApiErrorDto("Khong xac dinh duoc nhan vien.", null));

        await using var transaction = await _context.Database.BeginTransactionAsync();
        var order = await _context.Orders
            .Include(order => order.Orderassignments)
            .FirstOrDefaultAsync(order => order.Orderid == orderId);
        if (order == null) return NotFound(new ApiErrorDto("Don hang khong ton tai.", null));

        if (department == SalesDepartment && order.Orderstatus != "Pending")
            return BadRequest(new ApiErrorDto("Sales chi co the nhan don dang cho xu ly.", null));
        if (department == WarehouseDepartment &&
            (order.Orderstatus != "Processing" ||
             !order.Orderassignments.Any(item => item.Department == WarehouseDepartment)))
            return BadRequest(new ApiErrorDto("Don hang chua duoc ban giao cho kho.", null));

        var assignment = order.Orderassignments
            .FirstOrDefault(item => item.Department == department);
        if (assignment?.Status == "Assigned" && assignment.Assigneduserid != userId)
            return Conflict(new ApiErrorDto("Don hang da co nhan vien khac phu trach.", null));
        if (assignment?.Status == "Completed")
            return Conflict(new ApiErrorDto("Cong viec cua bo phan nay da hoan tat.", null));

        if (assignment == null)
        {
            assignment = new Orderassignment
            {
                Orderid = orderId,
                Department = department,
                Status = "Assigned"
            };
            _context.Orderassignments.Add(assignment);
        }

        assignment.Assigneduserid = userId;
        assignment.Assignedbyuserid = userId;
        assignment.Assignedat ??= DateTime.UtcNow;
        assignment.Status = "Assigned";
        assignment.Note = string.IsNullOrWhiteSpace(dto.Note) ? assignment.Note : dto.Note.Trim();

        try
        {
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync();
            return Conflict(new ApiErrorDto("Don hang vua duoc nhan vien khac tiep nhan.", null));
        }

        await _context.Entry(assignment).Reference(item => item.Assigneduser).LoadAsync();
        await _context.Entry(assignment).Reference(item => item.Assignedbyuser).LoadAsync();
        return Ok(MapAssignment(assignment));
    }

    [HttpPost("{orderId}/assign")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<OrderAssignmentDto>> Assign(
        int orderId,
        [FromBody] AssignOrderRequestDto dto)
    {
        var department = NormalizeDepartment(dto.Department);
        if (department.Length == 0)
            return BadRequest(new ApiErrorDto("Bo phan khong hop le.", null));

        var assignedByUserId = GetClaimUserId();
        var target = await _context.Users
            .Include(user => user.Role)
            .FirstOrDefaultAsync(user => user.Userid == dto.Assigneduserid);
        if (target == null || target.Isactive != true)
            return BadRequest(new ApiErrorDto("Nhan vien duoc chon khong hoat dong.", null));
        if (target.Role?.Rolename != department)
            return BadRequest(new ApiErrorDto("Nhan vien khong thuoc bo phan duoc phan cong.", null));

        var order = await _context.Orders
            .Include(item => item.Orderassignments)
            .FirstOrDefaultAsync(item => item.Orderid == orderId);
        if (order == null) return NotFound(new ApiErrorDto("Don hang khong ton tai.", null));

        var assignment = order.Orderassignments.FirstOrDefault(item => item.Department == department);
        if (assignment?.Status == "Completed")
            return Conflict(new ApiErrorDto("Cong viec cua bo phan nay da hoan tat.", null));

        if (assignment == null)
        {
            assignment = new Orderassignment
            {
                Orderid = orderId,
                Department = department
            };
            _context.Orderassignments.Add(assignment);
        }

        assignment.Assigneduserid = target.Userid;
        assignment.Assignedbyuserid = assignedByUserId;
        assignment.Assignedat = DateTime.UtcNow;
        assignment.Status = "Assigned";
        assignment.Note = string.IsNullOrWhiteSpace(dto.Note) ? assignment.Note : dto.Note.Trim();
        await _context.SaveChangesAsync();

        assignment.Assigneduser = target;
        if (assignedByUserId.HasValue)
        {
            assignment.Assignedbyuser = await _context.Users.FindAsync(assignedByUserId.Value);
        }
        return Ok(MapAssignment(assignment));
    }

    [HttpPost("{orderId}/handoff-to-warehouse")]
    [Authorize(Roles = "Admin,Manager,Sales")]
    public async Task<ActionResult<OrderWorkflowItemDto>> HandoffToWarehouse(
        int orderId,
        [FromBody] HandoffOrderRequestDto dto)
    {
        var userId = GetClaimUserId();
        var order = await _context.Orders
            .Include(item => item.Orderitems)
                .ThenInclude(item => item.ImeiNavigation)
                    .ThenInclude(item => item!.Variant)
                        .ThenInclude(item => item!.Product)
            .Include(item => item.Orderassignments)
            .FirstOrDefaultAsync(item => item.Orderid == orderId);
        if (order == null) return NotFound(new ApiErrorDto("Don hang khong ton tai.", null));
        if (order.Orderstatus != "Pending")
            return BadRequest(new ApiErrorDto("Chi don dang cho moi co the ban giao.", null));
        if (!IsPaymentReady(order))
            return BadRequest(new ApiErrorDto("Don hang chua dat coc/thanh toan du dieu kien.", null));

        var salesAssignment = order.Orderassignments
            .FirstOrDefault(item => item.Department == SalesDepartment);
        if (User.IsInRole("Sales") &&
            (salesAssignment == null ||
             salesAssignment.Assigneduserid != userId ||
             salesAssignment.Status != "Assigned"))
            return StatusCode(403, new ApiErrorDto("Ban phai nhan don truoc khi ban giao.", null));

        if (salesAssignment != null)
        {
            salesAssignment.Status = "Completed";
            salesAssignment.Completedat = DateTime.UtcNow;
        }

        var warehouseAssignment = order.Orderassignments
            .FirstOrDefault(item => item.Department == WarehouseDepartment);
        if (warehouseAssignment == null)
        {
            warehouseAssignment = new Orderassignment
            {
                Orderid = orderId,
                Department = WarehouseDepartment,
                Status = "Pending",
                Assignedbyuserid = userId,
                Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim()
            };
            _context.Orderassignments.Add(warehouseAssignment);
        }
        else
        {
            warehouseAssignment.Status = "Pending";
            warehouseAssignment.Assigneduserid = null;
            warehouseAssignment.Assignedat = null;
            warehouseAssignment.Completedat = null;
            warehouseAssignment.Assignedbyuserid = userId;
            warehouseAssignment.Note = string.IsNullOrWhiteSpace(dto.Note)
                ? warehouseAssignment.Note
                : dto.Note.Trim();
        }

        order.Orderstatus = "Processing";
        await _context.SaveChangesAsync();

        await _context.Entry(warehouseAssignment).Reference(item => item.Assignedbyuser).LoadAsync();
        return Ok(MapWorkflow(order, WarehouseDepartment));
    }

    [HttpPost("{orderId}/mark-shipped")]
    [Authorize(Roles = "Admin,Manager,Warehouse")]
    public async Task<ActionResult<OrderWorkflowItemDto>> MarkShipped(
        int orderId,
        [FromBody] MarkOrderShippedRequestDto dto)
    {
        var userId = GetClaimUserId();
        var order = await _context.Orders
            .Include(item => item.Orderitems)
                .ThenInclude(item => item.ImeiNavigation)
                    .ThenInclude(item => item!.Variant)
                        .ThenInclude(item => item!.Product)
            .Include(item => item.Orderassignments)
                .ThenInclude(item => item.Assigneduser)
            .FirstOrDefaultAsync(item => item.Orderid == orderId);
        if (order == null) return NotFound(new ApiErrorDto("Don hang khong ton tai.", null));
        if (order.Orderstatus != "Processing")
            return BadRequest(new ApiErrorDto("Don hang khong o trang thai dang xu ly.", null));

        var assignment = order.Orderassignments
            .FirstOrDefault(item => item.Department == WarehouseDepartment);
        if (assignment == null)
            return BadRequest(new ApiErrorDto("Don hang chua duoc ban giao cho kho.", null));
        if (User.IsInRole("Warehouse") &&
            (assignment.Assigneduserid != userId || assignment.Status != "Assigned"))
            return StatusCode(403, new ApiErrorDto("Ban phai nhan don truoc khi xac nhan giao.", null));

        var expectedImeis = order.Orderitems
            .Where(item => !string.IsNullOrWhiteSpace(item.Imei))
            .Select(item => item.Imei!)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var confirmedImeis = dto.Imeis
            .Where(item => !string.IsNullOrWhiteSpace(item))
            .Select(item => item.Trim())
            .ToList();
        var confirmedSet = confirmedImeis.ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (expectedImeis.Count == 0 ||
            confirmedImeis.Count != confirmedSet.Count ||
            !expectedImeis.SetEquals(confirmedSet))
        {
            return BadRequest(new ApiErrorDto(
                "Danh sach IMEI xac nhan khong khop voi thiet bi cua don hang.",
                null));
        }

        var inventoryItems = order.Orderitems
            .Select(item => item.ImeiNavigation)
            .Where(item => item != null)
            .Cast<Inventoryitem>()
            .ToList();
        if (inventoryItems.Count != expectedImeis.Count ||
            inventoryItems.Any(item => item.Status != "Reserved"))
        {
            return Conflict(new ApiErrorDto(
                "Co thiet bi khong con o trang thai Reserved. Vui long kiem tra lai kho.",
                null));
        }

        foreach (var inventoryItem in inventoryItems)
        {
            var previousStatus = inventoryItem.Status;
            inventoryItem.Status = "Shipping";
            _context.Inventorytransactions.Add(new Inventorytransaction
            {
                Imei = inventoryItem.Imei,
                Orderid = order.Orderid,
                Userid = userId,
                Transactiontype = "Ship",
                Fromstatus = previousStatus,
                Tostatus = "Shipping",
                Note = string.IsNullOrWhiteSpace(dto.Note)
                    ? "Warehouse confirmed device and released order for delivery."
                    : dto.Note.Trim(),
                Createdat = DateTime.UtcNow
            });
        }

        assignment.Status = "Completed";
        assignment.Completedat = DateTime.UtcNow;
        order.Orderstatus = "Shipped";
        await _context.SaveChangesAsync();
        return Ok(MapWorkflow(order, WarehouseDepartment));
    }
}
