using System.Text.Json;
using ECommerceBackend.DTOs.Common;
using ECommerceBackend.DTOs.Returns;
using ECommerceBackend.Models;
using ECommerceBackend.Services.Returns;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ECommerceBackend.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Policy = "returns.access")]
public class ReturnRequestsController : ControllerBase
{
    private static readonly HashSet<string> RequestTypes =
        new(StringComparer.OrdinalIgnoreCase) { "Return", "Exchange" };
    private static readonly HashSet<string> Dispositions =
        new(StringComparer.OrdinalIgnoreCase) { "Restock", "Warranty", "Damaged" };
    private static readonly HashSet<string> TerminalStatuses =
        new(StringComparer.OrdinalIgnoreCase) { "Rejected", "Cancelled", "Completed" };

    private readonly ECommerceContext _context;
    private readonly IReturnRefundPolicyService _refundPolicy;

    public ReturnRequestsController(ECommerceContext context, IReturnRefundPolicyService refundPolicy)
    {
        _context = context;
        _refundPolicy = refundPolicy;
    }

    private int? CurrentUserId()
    {
        var value = User.FindFirst("userid")?.Value;
        return int.TryParse(value, out var userId) ? userId : null;
    }

    private static IReadOnlyList<string> DeserializeImages(string? json)
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

    private static RefundDestinationDto? DeserializeRefundDestination(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            return JsonSerializer.Deserialize<RefundDestinationDto>(json);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static RefundCalculationDto? DeserializeRefundCalculation(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            return JsonSerializer.Deserialize<RefundCalculationDto>(json);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private IQueryable<Returnrequest> RequestQuery() =>
        _context.Returnrequests
            .Include(request => request.Order)
                .ThenInclude(order => order.Shipment)
            .Include(request => request.Customer)
            .Include(request => request.Assigneduser)
            .Include(request => request.Returnitems)
                .ThenInclude(item => item.Orderitem)
                    .ThenInclude(item => item.ImeiNavigation)
                        .ThenInclude(inventory => inventory!.Variant)
                            .ThenInclude(variant => variant!.Product)
            .Include(request => request.Returnitems)
                .ThenInclude(item => item.Inventoryitem)
                    .ThenInclude(inventory => inventory.Variant)
                        .ThenInclude(variant => variant!.Product);

    private static ReturnRequestDto Map(
        Returnrequest request,
        IReadOnlyList<ReturnRequestHistoryDto>? histories = null,
        IReadOnlyList<RefundTransactionDto>? refundTransactions = null) =>
        new(
            request.Returnrequestid,
            request.Orderid,
            request.Customerid,
            request.Customer?.Fullname ?? request.Order.Shippingname,
            request.Customer?.Phone ?? request.Order.Shippingphone,
            request.Requestedbyuserid,
            request.Assigneduserid,
            request.Assigneduser?.Fullname,
            request.Requesttype,
            request.Reasoncategory,
            request.Reason,
            request.Description,
            request.Status,
            DeserializeImages(request.Imageurls),
            request.Reviewnote,
            request.Resolution,
            request.Requestedrefundamount,
            request.Approvedrefundamount,
            request.Refundamount,
            request.Refundstatus,
            DeserializeRefundDestination(request.Refundinfo),
            request.Policyversion,
            DeserializeRefundCalculation(request.Refundcalculation),
            request.Requestedat,
            request.Reviewedat,
            request.Receivedat,
            request.Completedat,
            request.Updatedat,
            request.Returnitems
                .OrderBy(item => item.Returnitemid)
                .Select(item => new ReturnItemDto(
                    item.Returnitemid,
                    item.Orderitemid,
                    item.Imei,
                    item.Inventoryitem.Variantid,
                    item.Orderitem.ImeiNavigation?.Variant?.Product?.Productname,
                    item.Orderitem.ImeiNavigation?.Variant?.Sku,
                    item.Condition,
                    item.Disposition,
                    item.Replacementimei,
                    item.Refundamount,
                    item.Originalpaidamount,
                    item.Inspectiongrade,
                    item.Faultresponsibility,
                    item.Deductionamount,
                    item.Resalevariantid))
                .ToList(),
            histories ?? [],
            refundTransactions ?? []);

    private async Task<IReadOnlyList<ReturnRequestDto>> MapManyAsync(
        IReadOnlyList<Returnrequest> requests)
    {
        if (requests.Count == 0) return [];

        var requestIds = requests.Select(request => request.Returnrequestid).ToList();
        var histories = await _context.Statuslogs
            .AsNoTracking()
            .Include(log => log.User)
            .Where(log => log.Entitytype == "ReturnRequest" && requestIds.Contains(log.Entityid))
            .OrderBy(log => log.Createdat)
            .ThenBy(log => log.Logid)
            .ToListAsync();
        var payments = await _context.Orderpayments
            .AsNoTracking()
            .Where(payment =>
                payment.Transactiontype == "Refund" &&
                payment.Returnrequestid.HasValue &&
                requestIds.Contains(payment.Returnrequestid.Value))
            .OrderBy(payment => payment.Createdat)
            .ThenBy(payment => payment.Paymentid)
            .ToListAsync();

        var historiesByRequest = histories
            .GroupBy(log => log.Entityid)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<ReturnRequestHistoryDto>)group.Select(log =>
                    new ReturnRequestHistoryDto(
                        log.Logid,
                        log.Userid,
                        log.User?.Fullname,
                        log.Fromstatus,
                        log.Tostatus,
                        log.Note,
                        log.Createdat)).ToList());
        var paymentsByRequest = payments
            .GroupBy(payment => payment.Returnrequestid!.Value)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<RefundTransactionDto>)group.Select(payment =>
                    new RefundTransactionDto(
                        payment.Paymentid,
                        payment.Amount,
                        payment.Provider,
                        payment.Status,
                        payment.Transactionref,
                        null,
                        payment.Paidat ?? payment.Createdat)).ToList());

        return requests.Select(request => Map(
            request,
            historiesByRequest.GetValueOrDefault(request.Returnrequestid, []),
            paymentsByRequest.GetValueOrDefault(request.Returnrequestid, []))).ToList();
    }

    private async Task<ReturnRequestDto> MapOneAsync(Returnrequest request) =>
        (await MapManyAsync([request])).Single();

    private static IReadOnlyDictionary<int, decimal> CalculateRefundAmounts(
        Order order,
        IReadOnlyCollection<Orderitem> selectedItems)
    {
        var allItems = order.Orderitems.ToList();
        var orderGross = allItems.Sum(ItemGrossAmount);
        if (orderGross <= 0)
            return selectedItems.ToDictionary(item => item.Orderitemid, _ => 0m);

        // Allocate the amount actually owed after an order-level discount to each
        // item. This prevents a return from reimbursing more than was paid.
        // The original delivery fee has already been consumed and is not part of
        // the merchandise value eligible for return/refund.
        var refundableOrderTotal = Math.Clamp(order.Finalamount - order.Shippingfee, 0m, orderGross);
        var selectedIds = selectedItems.Select(item => item.Orderitemid).ToHashSet();
        var amounts = new Dictionary<int, decimal>();
        decimal allocated = 0m;

        for (var index = 0; index < allItems.Count; index++)
        {
            var item = allItems[index];
            var amount = index == allItems.Count - 1
                ? refundableOrderTotal - allocated
                : decimal.Round(
                    refundableOrderTotal * ItemGrossAmount(item) / orderGross,
                    2,
                    MidpointRounding.AwayFromZero);
            amount = Math.Max(0m, amount);
            allocated += amount;

            if (selectedIds.Contains(item.Orderitemid))
                amounts[item.Orderitemid] = amount;
        }

        return amounts;
    }

    private static decimal ItemGrossAmount(Orderitem item) =>
        item.Sellingprice + (item.Warrantyprice ?? 0m);

    [HttpGet]
    [ECommerceBackend.Authorization.HasPermission(ECommerceBackend.Authorization.AppPermissions.ReturnsView)]
    public async Task<ActionResult<IEnumerable<ReturnRequestDto>>> GetRequests(
        [FromQuery] string? status,
        [FromQuery] bool assignedToMe = false)
    {
        var query = RequestQuery().AsNoTracking();
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(request => request.Status == status.Trim());
        if (assignedToMe)
        {
            var userId = CurrentUserId();
            if (!userId.HasValue) return Unauthorized();
            query = query.Where(request => request.Assigneduserid == userId);
        }

        var requests = await query
            .OrderByDescending(request => request.Updatedat)
            .ToListAsync();
        return Ok(await MapManyAsync(requests));
    }

    [HttpGet("mine")]
    [Authorize(Roles = "Customer")]
    public async Task<ActionResult<IEnumerable<ReturnRequestDto>>> GetMine()
    {
        var userId = CurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var requests = await RequestQuery()
            .AsNoTracking()
            .Where(request =>
                request.Requestedbyuserid == userId ||
                request.Order.Userid == userId)
            .OrderByDescending(request => request.Updatedat)
            .ToListAsync();
        return Ok(await MapManyAsync(requests));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ReturnRequestDto>> GetRequest(int id)
    {
        var request = await RequestQuery().AsNoTracking()
            .FirstOrDefaultAsync(item => item.Returnrequestid == id);
        if (request == null)
            return NotFound(new ApiErrorDto("Yêu cầu đổi trả không tồn tại.", null));

        if (User.IsInRole("Customer") &&
            request.Requestedbyuserid != CurrentUserId() &&
            request.Order.Userid != CurrentUserId())
        {
            return StatusCode(403, new ApiErrorDto("Bạn không có quyền xem yêu cầu này.", null));
        }

        return Ok(await MapOneAsync(request));
    }

    [HttpGet("employees")]
    [ECommerceBackend.Authorization.HasPermission(ECommerceBackend.Authorization.AppPermissions.ReturnsManage)]
    public async Task<ActionResult<IEnumerable<object>>> GetSalesEmployees()
    {
        var employees = await _context.Users
            .AsNoTracking()
            .Include(user => user.Role)
            .Where(user => user.Isactive == true && user.Role != null && user.Role.Rolename == "Sales")
            .OrderBy(user => user.Fullname)
            .Select(user => new { user.Userid, user.Fullname })
            .ToListAsync();
        return Ok(employees);
    }

    [HttpPost]
    public async Task<ActionResult<ReturnRequestDto>> CreateRequest(CreateReturnRequestDto dto)
    {
        var requestType = dto.Requesttype.Trim();
        if (!RequestTypes.Contains(requestType))
            return BadRequest(new ApiErrorDto("Loại yêu cầu chỉ nhận Return hoặc Exchange.", null));
        if (dto.Orderitemids.Count == 0)
            return BadRequest(new ApiErrorDto("Vui lòng chọn ít nhất một sản phẩm.", null));
        if (string.IsNullOrWhiteSpace(dto.Reason))
            return BadRequest(new ApiErrorDto("Vui lòng nhập lý do đổi trả.", null));
        var reasonCategory = _refundPolicy.ReasonCategories.FirstOrDefault(item =>
            item.Equals(dto.Reasoncategory?.Trim(), StringComparison.OrdinalIgnoreCase));
        if (reasonCategory == null)
            return BadRequest(new ApiErrorDto("Nhóm lý do đổi trả không hợp lệ.", null));

        var order = await _context.Orders
            .Include(item => item.Customer)
            .Include(item => item.Shipment)
            .Include(item => item.Orderitems)
                .ThenInclude(item => item.ImeiNavigation)
            .FirstOrDefaultAsync(item => item.Orderid == dto.Orderid);
        if (order == null)
            return NotFound(new ApiErrorDto("Đơn hàng không tồn tại.", null));
        if (order.Orderstatus != "Completed")
            return BadRequest(new ApiErrorDto("Chỉ đơn hàng đã hoàn thành mới được yêu cầu đổi trả.", null));
        DateTime deliveryDate;
        try
        {
            deliveryDate = _refundPolicy.ResolveDeliveryDate(
                order.Shipment?.Deliveredat,
                order.Warehousecompletedat,
                order.Orderdate);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new ApiErrorDto(exception.Message, null));
        }
        var now = DateTime.UtcNow;
        var daysSinceDelivery = _refundPolicy.DaysSinceDelivery(deliveryDate, now);
        if (daysSinceDelivery > 30)
            return BadRequest(new ApiErrorDto("Đơn hàng đã quá thời hạn đổi trả 30 ngày.", null));

        var currentUserId = CurrentUserId();
        if (User.IsInRole("Customer") && order.Userid != currentUserId)
            return StatusCode(403, new ApiErrorDto("Đơn hàng không thuộc tài khoản của bạn.", null));

        var selectedIds = dto.Orderitemids.Distinct().ToList();
        var selectedItems = order.Orderitems
            .Where(item => selectedIds.Contains(item.Orderitemid))
            .ToList();
        if (selectedItems.Count != selectedIds.Count || selectedItems.Any(item => item.Imei == null))
            return BadRequest(new ApiErrorDto("Sản phẩm đổi trả không hợp lệ hoặc chưa được xuất IMEI.", null));

        var hasProcessedItems = await _context.Returnitems.AnyAsync(item =>
            selectedIds.Contains(item.Orderitemid) &&
            item.Returnrequest.Status != "Rejected" &&
            item.Returnrequest.Status != "Cancelled");
        if (hasProcessedItems)
            return Conflict(new ApiErrorDto("Một sản phẩm đã có yêu cầu đổi trả trước đó.", null));

        var imageUrls = (dto.Imageurls ?? [])
            .Where(url => !string.IsNullOrWhiteSpace(url))
            .Select(url => url.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(6)
            .ToList();
        if (imageUrls.Any(url => !url.Contains("/uploads/returns/", StringComparison.OrdinalIgnoreCase)))
            return BadRequest(new ApiErrorDto("Ảnh đổi trả phải được tải lên từ máy.", null));

        RefundDestinationDto? refundDestination = null;
        if (requestType.Equals("Return", StringComparison.OrdinalIgnoreCase))
        {
            var requiresBankDestination = order.Paymentmethod == "BANK";
            if (dto.Refunddestination == null)
                return BadRequest(new ApiErrorDto("Vui lòng chọn phương thức nhận tiền hoàn.", null));

            if (dto.Refunddestination != null)
            {
                var method = dto.Refunddestination.Method.Trim().ToUpperInvariant();
                if (method is not ("BANK" or "CASH"))
                    return BadRequest(new ApiErrorDto("Phương thức nhận hoàn tiền không hợp lệ.", null));
                if (requiresBankDestination && method != "BANK")
                    return BadRequest(new ApiErrorDto("Đơn chuyển khoản phải được hoàn qua tài khoản ngân hàng.", null));
                if (method == "BANK" &&
                    (string.IsNullOrWhiteSpace(dto.Refunddestination.Bankname) ||
                     string.IsNullOrWhiteSpace(dto.Refunddestination.Accountnumber) ||
                     string.IsNullOrWhiteSpace(dto.Refunddestination.Accountholder)))
                {
                    return BadRequest(new ApiErrorDto("Vui lòng nhập đầy đủ ngân hàng, số tài khoản và chủ tài khoản.", null));
                }
                if (method == "BANK" &&
                    !dto.Refunddestination.Accountnumber!.All(char.IsDigit))
                    return BadRequest(new ApiErrorDto("Số tài khoản chỉ được chứa chữ số.", null));
                if (!dto.Refunddestination.Confirmed)
                    return BadRequest(new ApiErrorDto("Khách hàng phải xác nhận thông tin nhận tiền hoàn.", null));

                refundDestination = new RefundDestinationDto(
                    method,
                    string.IsNullOrWhiteSpace(dto.Refunddestination.Bankname) ? null : dto.Refunddestination.Bankname.Trim(),
                    string.IsNullOrWhiteSpace(dto.Refunddestination.Accountnumber) ? null : dto.Refunddestination.Accountnumber.Trim(),
                    string.IsNullOrWhiteSpace(dto.Refunddestination.Accountholder) ? null : dto.Refunddestination.Accountholder.Trim().ToUpperInvariant(),
                    true);
            }
        }

        var originalPaidAmounts = requestType.Equals("Return", StringComparison.OrdinalIgnoreCase)
            ? CalculateRefundAmounts(order, selectedItems)
            : new Dictionary<int, decimal>();
        var estimates = requestType.Equals("Return", StringComparison.OrdinalIgnoreCase)
            ? selectedItems.Select(item => _refundPolicy.Estimate(
                    item.Orderitemid,
                    item.Imei!,
                    originalPaidAmounts.GetValueOrDefault(item.Orderitemid, 0m),
                    daysSinceDelivery,
                    reasonCategory))
                .ToList()
            : [];
        var requestedRefund = estimates.Sum(item => item.Refundamount);
        var request = new Returnrequest
        {
            Orderid = order.Orderid,
            Customerid = order.Customerid,
            Requestedbyuserid = currentUserId,
            Requesttype = requestType,
            Reasoncategory = reasonCategory,
            Reason = dto.Reason.Trim(),
            Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
            Status = "PendingReview",
            Imageurls = JsonSerializer.Serialize(imageUrls),
            Requestedrefundamount = requestedRefund,
            Approvedrefundamount = null,
            Refundstatus = requestedRefund > 0 ? "Pending" : "NotRequired",
            Refundinfo = refundDestination == null ? null : JsonSerializer.Serialize(refundDestination),
            Policyversion = _refundPolicy.PolicyVersion,
            Refundcalculation = requestType.Equals("Return", StringComparison.OrdinalIgnoreCase)
                ? JsonSerializer.Serialize(new RefundCalculationDto(
                    _refundPolicy.PolicyVersion,
                    deliveryDate,
                    daysSinceDelivery,
                    estimates.Sum(item => item.Deductionamount),
                    estimates))
                : null,
            Requestedat = now,
            Updatedat = now
        };
        foreach (var item in selectedItems)
        {
            var estimate = estimates.FirstOrDefault(value => value.Orderitemid == item.Orderitemid);
            request.Returnitems.Add(new Returnitem
            {
                Orderitemid = item.Orderitemid,
                Imei = item.Imei!,
                Originalpaidamount = originalPaidAmounts.GetValueOrDefault(item.Orderitemid, 0m),
                Refundamount = estimate?.Refundamount ?? 0m,
                Deductionamount = estimate?.Deductionamount ?? 0m
            });
        }
        await using (var transaction = await _context.Database.BeginTransactionAsync())
        {
            _context.Returnrequests.Add(request);
            await _context.SaveChangesAsync();

            _context.Statuslogs.Add(new Statuslog
            {
                Entitytype = "ReturnRequest",
                Entityid = request.Returnrequestid,
                Userid = currentUserId,
                Fromstatus = string.Empty,
                Tostatus = "PendingReview",
                Note = "Khách hàng gửi yêu cầu đổi trả.",
                Createdat = now
            });

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }

        var created = await RequestQuery().AsNoTracking()
            .FirstAsync(item => item.Returnrequestid == request.Returnrequestid);
        return CreatedAtAction(
            nameof(GetRequest),
            new { id = request.Returnrequestid },
            await MapOneAsync(created));
    }

    [HttpPost("{id:int}/claim")]
    [ECommerceBackend.Authorization.HasPermission(ECommerceBackend.Authorization.AppPermissions.ReturnsReview)]
    public async Task<ActionResult<ReturnRequestDto>> Claim(int id)
    {
        var userId = CurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var request = await _context.Returnrequests.FirstOrDefaultAsync(item => item.Returnrequestid == id);
        if (request == null)
            return NotFound(new ApiErrorDto("Yêu cầu đổi trả không tồn tại.", null));
        if (TerminalStatuses.Contains(request.Status))
            return Conflict(new ApiErrorDto("Yêu cầu đã kết thúc.", null));
        if (request.Assigneduserid.HasValue && request.Assigneduserid != userId)
            return Conflict(new ApiErrorDto("Yêu cầu đã có nhân viên khác phụ trách.", null));

        request.Assigneduserid = userId;
        request.Updatedat = DateTime.UtcNow;
        AddHistory(request, userId, request.Status, request.Status, "Nhân viên Sales nhận phụ trách.");
        await _context.SaveChangesAsync();
        return Ok(await MapOneAsync(await RequestQuery().AsNoTracking().FirstAsync(item => item.Returnrequestid == id)));
    }

    [HttpPatch("{id:int}/assign")]
    [ECommerceBackend.Authorization.HasPermission(ECommerceBackend.Authorization.AppPermissions.ReturnsManage)]
    public async Task<ActionResult<ReturnRequestDto>> Assign(int id, AssignReturnRequestDto dto)
    {
        var request = await _context.Returnrequests.FirstOrDefaultAsync(item => item.Returnrequestid == id);
        if (request == null)
            return NotFound(new ApiErrorDto("Yêu cầu đổi trả không tồn tại.", null));
        if (TerminalStatuses.Contains(request.Status))
            return Conflict(new ApiErrorDto("Yêu cầu đã kết thúc.", null));

        var employee = await _context.Users.Include(user => user.Role)
            .FirstOrDefaultAsync(user => user.Userid == dto.Assigneduserid);
        if (employee?.Isactive != true || employee.Role?.Rolename != "Sales")
            return BadRequest(new ApiErrorDto("Tài khoản được chọn không thuộc bộ phận Sales.", null));

        request.Assigneduserid = employee.Userid;
        request.Updatedat = DateTime.UtcNow;
        AddHistory(
            request,
            CurrentUserId(),
            request.Status,
            request.Status,
            string.IsNullOrWhiteSpace(dto.Note) ? $"Phân công cho {employee.Fullname}." : dto.Note.Trim());
        await _context.SaveChangesAsync();
        return Ok(await MapOneAsync(await RequestQuery().AsNoTracking().FirstAsync(item => item.Returnrequestid == id)));
    }

    [HttpPatch("{id:int}/review")]
    [ECommerceBackend.Authorization.HasPermission(ECommerceBackend.Authorization.AppPermissions.ReturnsReview)]
    public async Task<ActionResult<ReturnRequestDto>> Review(int id, ReviewReturnRequestDto dto)
    {
        var request = await _context.Returnrequests.FirstOrDefaultAsync(item => item.Returnrequestid == id);
        if (request == null)
            return NotFound(new ApiErrorDto("Yêu cầu đổi trả không tồn tại.", null));
        if (request.Status != "PendingReview")
            return Conflict(new ApiErrorDto("Yêu cầu không còn ở trạng thái chờ duyệt.", null));
        if (User.IsInRole("Sales") && request.Assigneduserid != CurrentUserId())
            return StatusCode(403, new ApiErrorDto("Bạn phải nhận yêu cầu trước khi duyệt.", null));
        if (!dto.Approved && string.IsNullOrWhiteSpace(dto.Note))
            return BadRequest(new ApiErrorDto("Cần nhập lý do từ chối.", null));

        var previous = request.Status;
        request.Status = dto.Approved ? "Approved" : "Rejected";
        request.Reviewnote = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim();
        request.Reviewedat = DateTime.UtcNow;
        request.Updatedat = request.Reviewedat;
        if (!dto.Approved)
        {
            request.Completedat = request.Reviewedat;
            request.Refundstatus = "NotRequired";
        }
        AddHistory(request, CurrentUserId(), previous, request.Status, request.Reviewnote);
        await _context.SaveChangesAsync();
        return Ok(await MapOneAsync(await RequestQuery().AsNoTracking().FirstAsync(item => item.Returnrequestid == id)));
    }

    [HttpPatch("{id:int}/receive")]
    [ECommerceBackend.Authorization.HasPermission(ECommerceBackend.Authorization.AppPermissions.ReturnsReceive)]
    public async Task<ActionResult<ReturnRequestDto>> Receive(int id, ReceiveReturnRequestDto dto)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync();
        var request = await _context.Returnrequests
            .Include(item => item.Order)
                .ThenInclude(order => order.Shipment)
            .Include(item => item.Order)
                .ThenInclude(order => order.Orderitems)
            .Include(item => item.Returnitems)
                .ThenInclude(item => item.Orderitem)
            .Include(item => item.Returnitems)
                .ThenInclude(item => item.Inventoryitem)
                    .ThenInclude(inventory => inventory.Variant)
            .FirstOrDefaultAsync(item => item.Returnrequestid == id);
        if (request == null)
            return NotFound(new ApiErrorDto("Yêu cầu đổi trả không tồn tại.", null));
        if (request.Status != "Approved")
            return Conflict(new ApiErrorDto("Yêu cầu phải được duyệt trước khi kho tiếp nhận.", null));
        if (dto.Items.Count != request.Returnitems.Count)
            return BadRequest(new ApiErrorDto("Cần kiểm tra đầy đủ tất cả IMEI trong phiếu.", null));

        if (dto.Items.Select(item => item.Returnitemid).Distinct().Count() != dto.Items.Count)
            return BadRequest(new ApiErrorDto("Danh sách kiểm định có IMEI bị lặp.", null));
        var payload = dto.Items.ToDictionary(item => item.Returnitemid);
        if (request.Returnitems.Any(item => !payload.ContainsKey(item.Returnitemid)))
            return BadRequest(new ApiErrorDto("Danh sách IMEI tiếp nhận không khớp với phiếu.", null));

        var actorId = CurrentUserId();
        var now = DateTime.UtcNow;
        DateTime deliveryDate;
        try
        {
            deliveryDate = _refundPolicy.ResolveDeliveryDate(
                request.Order.Shipment?.Deliveredat,
                request.Order.Warehousecompletedat,
                request.Order.Orderdate);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new ApiErrorDto(exception.Message, null));
        }
        var daysSinceDelivery = _refundPolicy.DaysSinceDelivery(deliveryDate, now);
        var calculations = new List<RefundCalculationItemDto>();

        foreach (var item in request.Returnitems)
        {
            var input = payload[item.Returnitemid];
            if (!Dispositions.Contains(input.Disposition))
                return BadRequest(new ApiErrorDto("Phân loại máy chỉ nhận Restock, Warranty hoặc Damaged.", null));
            if (string.IsNullOrWhiteSpace(input.Condition))
                return BadRequest(new ApiErrorDto($"Cần nhập tình trạng cho IMEI {item.Imei}.", null));

            var inspectionGrade = _refundPolicy.InspectionGrades.FirstOrDefault(value =>
                value.Equals(input.Inspectiongrade?.Trim(), StringComparison.OrdinalIgnoreCase));
            if (inspectionGrade == null)
                return BadRequest(new ApiErrorDto($"Mức phân loại của IMEI {item.Imei} không hợp lệ.", null));
            var faultResponsibility = _refundPolicy.FaultResponsibilities.FirstOrDefault(value =>
                value.Equals(input.Faultresponsibility?.Trim(), StringComparison.OrdinalIgnoreCase));
            if (faultResponsibility == null)
                return BadRequest(new ApiErrorDto($"Trách nhiệm lỗi của IMEI {item.Imei} không hợp lệ.", null));
            if (input.Missingaccessorycount is < 0 or > 10)
                return BadRequest(new ApiErrorDto("Số phụ kiện thiếu phải từ 0 đến 10.", null));

            var original = item.Inventoryitem;
            if (original.Variant == null)
                return Conflict(new ApiErrorDto($"IMEI {item.Imei} không còn liên kết biến thể sản phẩm.", null));
            var disposition = NormalizeDisposition(input.Disposition);
            if (disposition == "Restock" && inspectionGrade == "Damaged")
                return BadRequest(new ApiErrorDto("Máy hư hỏng không thể nhập lại kho bán hàng.", null));
            if (disposition == "Restock" && faultResponsibility == "Customer")
                return BadRequest(new ApiErrorDto("Máy lỗi do khách sử dụng phải chuyển bảo hành hoặc hư hỏng.", null));

            item.Condition = input.Condition.Trim();
            item.Disposition = disposition;
            item.Inspectiongrade = inspectionGrade;
            item.Faultresponsibility = faultResponsibility;
            item.Resalevariantid = null;

            if (request.Requesttype.Equals("Exchange", StringComparison.OrdinalIgnoreCase))
            {
                var originalVariantId = original.Variantid;
                if (string.IsNullOrWhiteSpace(input.Replacementimei))
                    return BadRequest(new ApiErrorDto($"Cần chọn IMEI thay thế cho {item.Imei}.", null));

                var replacement = await _context.Inventoryitems
                    .FirstOrDefaultAsync(inventory => inventory.Imei == input.Replacementimei.Trim());
                if (replacement == null ||
                    replacement.Status != "InStock" ||
                    replacement.Variantid != originalVariantId)
                {
                    return BadRequest(new ApiErrorDto(
                        $"IMEI thay thế cho {item.Imei} phải cùng biến thể và đang còn trong kho.",
                        null));
                }

                await ApplyReturnedInventoryAsync(request, item, actorId, now);

                replacement.Status = "Sold";
                replacement.Warrantystartdate = now;
                replacement.Warrantyenddate = original.Warrantyenddate.HasValue &&
                                              original.Warrantyenddate.Value > now
                    ? original.Warrantyenddate
                    : now.AddYears(1);
                replacement.Warrantystatus = "Active";
                item.Replacementimei = replacement.Imei;
                item.Orderitem.Imei = replacement.Imei;

                _context.Inventorytransactions.Add(new Inventorytransaction
                {
                    Imei = replacement.Imei,
                    Orderid = request.Orderid,
                    Userid = actorId,
                    Transactiontype = "ExchangeOut",
                    Fromstatus = "InStock",
                    Tostatus = "Sold",
                    Note = $"Replacement for returned IMEI {item.Imei}.",
                    Createdat = now
                });
            }
            else
            {
                var calculation = _refundPolicy.Calculate(
                    item.Orderitemid,
                    item.Imei,
                    item.Originalpaidamount,
                    daysSinceDelivery,
                    inspectionGrade,
                    faultResponsibility,
                    input.Missingbox,
                    input.Missingaccessorycount);
                if (input.Refundamount.HasValue && input.Refundamount.Value != calculation.Refundamount)
                    return BadRequest(new ApiErrorDto(
                        $"Số tiền hoàn cho {item.Imei} phải do hệ thống tính là {calculation.Refundamount:N0} đồng.",
                        null));
                item.Deductionamount = calculation.Deductionamount;
                item.Refundamount = calculation.Refundamount;
                calculations.Add(calculation);
            }
        }

        var previous = request.Status;
        request.Receivedat = now;
        request.Resolution = string.IsNullOrWhiteSpace(dto.Resolution) ? null : dto.Resolution.Trim();
        request.Updatedat = now;
        if (request.Requesttype.Equals("Return", StringComparison.OrdinalIgnoreCase))
        {
            request.Approvedrefundamount = calculations.Sum(item => item.Refundamount);
            request.Refundcalculation = JsonSerializer.Serialize(new RefundCalculationDto(
                request.Policyversion,
                deliveryDate,
                daysSinceDelivery,
                calculations.Sum(item => item.Deductionamount),
                calculations));
            request.Status = "AwaitingCustomerConfirmation";
            request.Refundstatus = "AwaitingConfirmation";
        }
        else
        {
            request.Status = "Completed";
            request.Refundstatus = "NotRequired";
        }
        if (request.Status == "Completed") request.Completedat = now;
        AddHistory(request, actorId, previous, request.Status, dto.Note);

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();
        return Ok(await MapOneAsync(await RequestQuery().AsNoTracking().FirstAsync(item => item.Returnrequestid == id)));
    }

    [HttpPost("{id:int}/confirm-assessment")]
    [Authorize(Roles = "Customer")]
    public async Task<ActionResult<ReturnRequestDto>> ConfirmAssessment(
        int id,
        ConfirmRefundAssessmentDto dto)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync();
        var request = await _context.Returnrequests
            .Include(item => item.Order)
            .Include(item => item.Returnitems)
                .ThenInclude(item => item.Inventoryitem)
                    .ThenInclude(inventory => inventory.Variant)
            .FirstOrDefaultAsync(item => item.Returnrequestid == id);
        if (request == null)
            return NotFound(new ApiErrorDto("Yêu cầu đổi trả không tồn tại.", null));
        if (request.Requestedbyuserid != CurrentUserId() && request.Order.Userid != CurrentUserId())
            return StatusCode(403, new ApiErrorDto("Bạn không có quyền xác nhận yêu cầu này.", null));
        if (request.Status != "AwaitingCustomerConfirmation")
            return Conflict(new ApiErrorDto("Yêu cầu không chờ xác nhận kết quả kiểm định.", null));
        if (!dto.Accepted && string.IsNullOrWhiteSpace(dto.Note))
            return BadRequest(new ApiErrorDto("Vui lòng nhập lý do không đồng ý kết quả kiểm định.", null));

        var previous = request.Status;
        var now = DateTime.UtcNow;
        if (!dto.Accepted)
        {
            request.Status = "AssessmentDisputed";
            request.Refundstatus = "AssessmentDisputed";
            request.Updatedat = now;
            AddHistory(
                request,
                CurrentUserId(),
                previous,
                request.Status,
                $"Khách hàng không đồng ý kết quả kiểm định: {dto.Note!.Trim()}");
        }
        else
        {
            foreach (var item in request.Returnitems)
                await ApplyReturnedInventoryAsync(request, item, CurrentUserId(), now);

            request.Status = request.Approvedrefundamount > 0 ? "RefundPending" : "Completed";
            request.Refundstatus = request.Approvedrefundamount > 0 ? "Pending" : "NotRequired";
            request.Completedat = request.Status == "Completed" ? now : null;
            request.Updatedat = now;
            AddHistory(
                request,
                CurrentUserId(),
                previous,
                request.Status,
                string.IsNullOrWhiteSpace(dto.Note)
                    ? "Khách hàng đồng ý kết quả kiểm định và số tiền hoàn."
                    : $"Khách hàng đồng ý kết quả kiểm định. {dto.Note.Trim()}");
        }

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();
        return Ok(await MapOneAsync(await RequestQuery().AsNoTracking().FirstAsync(item => item.Returnrequestid == id)));
    }

    [HttpPost("{id:int}/reinspect")]
    [ECommerceBackend.Authorization.HasPermission(ECommerceBackend.Authorization.AppPermissions.ReturnsManage)]
    public async Task<ActionResult<ReturnRequestDto>> Reinspect(
        int id,
        ReinspectRefundAssessmentDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Note))
            return BadRequest(new ApiErrorDto("Bắt buộc nhập lý do yêu cầu kiểm định lại.", null));

        var request = await _context.Returnrequests
            .Include(item => item.Returnitems)
            .FirstOrDefaultAsync(item => item.Returnrequestid == id);
        if (request == null)
            return NotFound(new ApiErrorDto("Yêu cầu đổi trả không tồn tại.", null));
        if (request.Status != "AssessmentDisputed")
            return Conflict(new ApiErrorDto("Yêu cầu không có khiếu nại kết quả kiểm định.", null));

        foreach (var item in request.Returnitems)
        {
            item.Condition = null;
            item.Disposition = null;
            item.Inspectiongrade = null;
            item.Faultresponsibility = null;
            item.Deductionamount = 0m;
            item.Refundamount = item.Originalpaidamount;
            item.Resalevariantid = null;
        }
        var previous = request.Status;
        request.Status = "Approved";
        request.Refundstatus = "Pending";
        request.Approvedrefundamount = null;
        request.Refundcalculation = null;
        request.Receivedat = null;
        request.Updatedat = DateTime.UtcNow;
        AddHistory(request, CurrentUserId(), previous, request.Status, dto.Note.Trim());

        await _context.SaveChangesAsync();
        return Ok(await MapOneAsync(await RequestQuery().AsNoTracking().FirstAsync(item => item.Returnrequestid == id)));
    }

    [HttpPost("{id:int}/override-assessment")]
    [ECommerceBackend.Authorization.HasPermission(ECommerceBackend.Authorization.AppPermissions.ReturnsManage)]
    public async Task<ActionResult<ReturnRequestDto>> OverrideAssessment(
        int id,
        OverrideRefundAssessmentDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Note))
            return BadRequest(new ApiErrorDto("Bắt buộc nhập lý do điều chỉnh ngoại lệ.", null));

        var request = await _context.Returnrequests
            .Include(item => item.Returnitems)
            .FirstOrDefaultAsync(item => item.Returnrequestid == id);
        if (request == null)
            return NotFound(new ApiErrorDto("Yêu cầu đổi trả không tồn tại.", null));
        if (request.Status is not ("AwaitingCustomerConfirmation" or "AssessmentDisputed"))
            return Conflict(new ApiErrorDto("Chỉ được điều chỉnh kết quả đang chờ xác nhận hoặc đang khiếu nại.", null));

        var maximumRefund = request.Returnitems.Sum(item => item.Originalpaidamount);
        if (dto.Approvedrefundamount < 0 || dto.Approvedrefundamount > maximumRefund)
            return BadRequest(new ApiErrorDto(
                $"Số tiền điều chỉnh phải từ 0 đến {maximumRefund:N0} đồng.",
                null));

        var oldAmount = request.Approvedrefundamount ?? request.Returnitems.Sum(item => item.Refundamount);
        var allocationBase = maximumRefund;
        decimal allocated = 0m;
        var calculation = DeserializeRefundCalculation(request.Refundcalculation);
        var calculationItems = new List<RefundCalculationItemDto>();

        for (var index = 0; index < request.Returnitems.Count; index++)
        {
            var item = request.Returnitems.OrderBy(value => value.Returnitemid).ElementAt(index);
            var weight = allocationBase <= 0
                ? 0m
                : item.Originalpaidamount / allocationBase;
            var refund = index == request.Returnitems.Count - 1
                ? dto.Approvedrefundamount - allocated
                : decimal.Round(dto.Approvedrefundamount * weight, 0, MidpointRounding.AwayFromZero);
            refund = Math.Clamp(refund, 0m, item.Originalpaidamount);
            allocated += refund;
            item.Refundamount = refund;
            item.Deductionamount = item.Originalpaidamount - refund;

            var previous = calculation?.Items.FirstOrDefault(value => value.Orderitemid == item.Orderitemid);
            var totalRate = item.Originalpaidamount <= 0
                ? 0m
                : decimal.Round(item.Deductionamount * 100m / item.Originalpaidamount, 2);
            calculationItems.Add(new RefundCalculationItemDto(
                item.Orderitemid,
                item.Imei,
                item.Originalpaidamount,
                item.Inspectiongrade ?? "Grade98",
                item.Faultresponsibility ?? "NoFault",
                previous?.Timedeductionrate ?? 0m,
                previous?.Conditiondeductionrate ?? 0m,
                previous?.Missingboxrate ?? 0m,
                previous?.Missingaccessoryrate ?? 0m,
                totalRate,
                item.Deductionamount,
                refund));
        }

        request.Approvedrefundamount = request.Returnitems.Sum(item => item.Refundamount);
        request.Refundcalculation = JsonSerializer.Serialize(new RefundCalculationDto(
            request.Policyversion,
            calculation?.Deliverydate ?? request.Receivedat ?? DateTime.UtcNow,
            calculation?.Dayssincedelivery ?? 0,
            request.Returnitems.Sum(item => item.Deductionamount),
            calculationItems,
            Manageroverride: true,
            Overridenote: dto.Note.Trim()));
        var previousStatus = request.Status;
        request.Status = "AwaitingCustomerConfirmation";
        request.Refundstatus = "AwaitingConfirmation";
        request.Updatedat = DateTime.UtcNow;
        AddHistory(
            request,
            CurrentUserId(),
            previousStatus,
            request.Status,
            $"Manager điều chỉnh mức hoàn từ {oldAmount:N0} thành {request.Approvedrefundamount:N0} đồng. {dto.Note.Trim()}",
            new { oldAmount, request.Approvedrefundamount, reason = dto.Note.Trim() });

        await _context.SaveChangesAsync();
        return Ok(await MapOneAsync(await RequestQuery().AsNoTracking().FirstAsync(item => item.Returnrequestid == id)));
    }

    [HttpPost("{id:int}/refund")]
    [ECommerceBackend.Authorization.HasPermission(ECommerceBackend.Authorization.AppPermissions.ReturnsManage)]
    public async Task<ActionResult<ReturnRequestDto>> Refund(int id, ProcessRefundDto dto)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync();
        var request = await _context.Returnrequests
            .Include(item => item.Order)
                .ThenInclude(order => order.Orderitems)
            .Include(item => item.Returnitems)
            .Include(item => item.Order).ThenInclude(o => o.Orderpayments)
            .FirstOrDefaultAsync(item => item.Returnrequestid == id);
        if (request == null)
            return NotFound(new ApiErrorDto("Yêu cầu đổi trả không tồn tại.", null));
        if (request.Status != "RefundPending")
            return Conflict(new ApiErrorDto("Yêu cầu không ở trạng thái chờ hoàn tiền.", null));
        if (User.IsInRole("Sales") && request.Assigneduserid != CurrentUserId())
            return StatusCode(403, new ApiErrorDto("Bạn không phụ trách yêu cầu này.", null));
        if (dto.Amount <= 0)
            return BadRequest(new ApiErrorDto("Số tiền hoàn phải lớn hơn 0.", null));
        if (string.IsNullOrWhiteSpace(dto.Provider))
            return BadRequest(new ApiErrorDto("Vui lòng chọn phương thức hoàn tiền.", null));

        var refundDestination = DeserializeRefundDestination(request.Refundinfo);
        var provider = dto.Provider.Trim();
        if (refundDestination == null && provider.Equals("Bank", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new ApiErrorDto(
                "Yêu cầu cũ chưa có tài khoản nhận tiền. Chỉ được hoàn tiền mặt hoặc bổ sung thông tin tài khoản trước.",
                null));
        if (refundDestination?.Method == "BANK")
        {
            if (!provider.Equals("Bank", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new ApiErrorDto("Yêu cầu này phải được hoàn bằng chuyển khoản ngân hàng.", null));
            if (string.IsNullOrWhiteSpace(dto.Transactionref))
                return BadRequest(new ApiErrorDto("Vui lòng nhập mã giao dịch chuyển khoản hoàn tiền.", null));
        }
        if (refundDestination?.Method == "CASH" &&
            !provider.Equals("Cash", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new ApiErrorDto("Khách hàng đã chọn nhận tiền mặt tại cửa hàng.", null));

        var transactionReference = string.IsNullOrWhiteSpace(dto.Transactionref)
            ? null
            : dto.Transactionref.Trim().ToUpperInvariant();
        if (transactionReference != null && await _context.Orderpayments.AnyAsync(payment =>
                payment.Transactiontype == "Refund" &&
                payment.Status != "Failed" &&
                payment.Transactionref == transactionReference))
            return Conflict(new ApiErrorDto("Mã giao dịch hoàn tiền đã được sử dụng.", null));

        var reservedBefore = request.Order.Orderpayments
            .Where(payment =>
                payment.Transactiontype == "Refund" &&
                payment.Returnrequestid == request.Returnrequestid &&
                payment.Status != "Failed")
            .Sum(p => p.Amount);
        var approvedRefund = request.Approvedrefundamount ?? request.Requestedrefundamount;
        var remaining = approvedRefund - reservedBefore;
        if (dto.Amount != remaining)
            return BadRequest(new ApiErrorDto(
                $"Phải hoàn toàn bộ số tiền còn lại là {remaining:N0} đồng; hệ thống không hỗ trợ hoàn từng phần.",
                null));

        var now = DateTime.UtcNow;
        request.Order.Orderpayments.Add(new Orderpayment
        {
            Amount = dto.Amount,
            Provider = provider,
            Paymenttype = "Refund",
            Status = "Processing",
            Transactiontype = "Refund",
            Returnrequestid = request.Returnrequestid,
            Transactionref = transactionReference ?? $"CASH-RF-{request.Returnrequestid}-{now:yyyyMMddHHmmss}",
            Createdat = now,
            Paidat = null
        });

        request.Status = "RefundProcessing";
        request.Refundstatus = "Processing";
        request.Updatedat = now;

        AddHistory(
            request,
            CurrentUserId(),
            "RefundPending",
            "RefundProcessing",
            string.IsNullOrWhiteSpace(dto.Note)
                ? $"Nhân viên đã thực hiện hoàn {dto.Amount:N0} qua {provider}; chờ khách xác nhận đã nhận tiền."
                : $"Nhân viên đã thực hiện hoàn {dto.Amount:N0} qua {provider}; chờ khách xác nhận. {dto.Note.Trim()}",
            new { amount = dto.Amount, provider, transactionReference });
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync();
            return Conflict(new ApiErrorDto(
                "Giao dịch hoàn tiền đã được ghi nhận trước đó. Vui lòng tải lại yêu cầu.",
                null));
        }
        await transaction.CommitAsync();

        return Ok(await MapOneAsync(await RequestQuery().AsNoTracking().FirstAsync(item => item.Returnrequestid == id)));
    }

    [HttpPost("{id:int}/confirm-refund-receipt")]
    [Authorize(Roles = "Customer")]
    public async Task<ActionResult<ReturnRequestDto>> ConfirmRefundReceipt(
        int id,
        ConfirmRefundReceiptDto dto)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync();
        var request = await RefundRequestQuery().FirstOrDefaultAsync(item => item.Returnrequestid == id);
        if (request == null)
            return NotFound(new ApiErrorDto("Yêu cầu đổi trả không tồn tại.", null));
        if (request.Requestedbyuserid != CurrentUserId() && request.Order.Userid != CurrentUserId())
            return StatusCode(403, new ApiErrorDto("Bạn không có quyền xác nhận yêu cầu này.", null));
        if (request.Status is not ("RefundProcessing" or "RefundDisputed"))
            return Conflict(new ApiErrorDto("Yêu cầu không có giao dịch đang chờ xác nhận.", null));

        var pendingPayments = request.Order.Orderpayments
            .Where(payment =>
                payment.Transactiontype == "Refund" &&
                payment.Returnrequestid == id &&
                payment.Status is "Processing" or "Disputed")
            .ToList();
        if (pendingPayments.Count == 0)
            return Conflict(new ApiErrorDto("Không tìm thấy giao dịch cần xác nhận.", null));

        var previous = request.Status;
        var now = DateTime.UtcNow;
        foreach (var payment in pendingPayments)
        {
            payment.Status = "Completed";
            payment.Paidat = now;
        }
        await FinalizeConfirmedRefundAsync(request, now);
        AddHistory(
            request,
            CurrentUserId(),
            previous,
            request.Status,
            string.IsNullOrWhiteSpace(dto.Note)
                ? "Khách hàng xác nhận đã nhận được tiền hoàn."
                : $"Khách hàng xác nhận đã nhận được tiền hoàn. {dto.Note.Trim()}");

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();
        return Ok(await MapOneAsync(await RequestQuery().AsNoTracking().FirstAsync(item => item.Returnrequestid == id)));
    }

    [HttpPost("{id:int}/dispute-refund")]
    [Authorize(Roles = "Customer")]
    public async Task<ActionResult<ReturnRequestDto>> DisputeRefund(int id, DisputeRefundDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Note))
            return BadRequest(new ApiErrorDto("Vui lòng mô tả việc chưa nhận được tiền.", null));

        var request = await RefundRequestQuery().FirstOrDefaultAsync(item => item.Returnrequestid == id);
        if (request == null)
            return NotFound(new ApiErrorDto("Yêu cầu đổi trả không tồn tại.", null));
        if (request.Requestedbyuserid != CurrentUserId() && request.Order.Userid != CurrentUserId())
            return StatusCode(403, new ApiErrorDto("Bạn không có quyền khiếu nại yêu cầu này.", null));
        if (request.Status != "RefundProcessing")
            return Conflict(new ApiErrorDto("Yêu cầu không ở trạng thái chờ xác nhận tiền hoàn.", null));

        foreach (var payment in request.Order.Orderpayments.Where(payment =>
                     payment.Transactiontype == "Refund" &&
                     payment.Returnrequestid == id &&
                     payment.Status == "Processing"))
            payment.Status = "Disputed";

        request.Status = "RefundDisputed";
        request.Refundstatus = "Disputed";
        request.Updatedat = DateTime.UtcNow;
        AddHistory(
            request,
            CurrentUserId(),
            "RefundProcessing",
            "RefundDisputed",
            $"Khách hàng báo chưa nhận được tiền: {dto.Note.Trim()}");
        await _context.SaveChangesAsync();
        return Ok(await MapOneAsync(await RequestQuery().AsNoTracking().FirstAsync(item => item.Returnrequestid == id)));
    }

    [HttpPost("{id:int}/resolve-refund-dispute")]
    [ECommerceBackend.Authorization.HasPermission(ECommerceBackend.Authorization.AppPermissions.ReturnsManage)]
    public async Task<ActionResult<ReturnRequestDto>> ResolveRefundDispute(
        int id,
        ResolveRefundDisputeDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Note))
            return BadRequest(new ApiErrorDto("Bắt buộc nhập kết quả đối soát.", null));
        var outcome = dto.Outcome.Trim().ToUpperInvariant();
        if (outcome is not ("CONFIRMED" or "FAILED"))
            return BadRequest(new ApiErrorDto("Kết quả đối soát chỉ nhận CONFIRMED hoặc FAILED.", null));

        await using var transaction = await _context.Database.BeginTransactionAsync();
        var request = await RefundRequestQuery().FirstOrDefaultAsync(item => item.Returnrequestid == id);
        if (request == null)
            return NotFound(new ApiErrorDto("Yêu cầu đổi trả không tồn tại.", null));
        if (request.Status != "RefundDisputed")
            return Conflict(new ApiErrorDto("Yêu cầu không ở trạng thái khiếu nại hoàn tiền.", null));
        if (User.IsInRole("Sales") && request.Assigneduserid != CurrentUserId())
            return StatusCode(403, new ApiErrorDto("Bạn không phụ trách yêu cầu này.", null));

        var disputedPayments = request.Order.Orderpayments
            .Where(payment =>
                payment.Transactiontype == "Refund" &&
                payment.Returnrequestid == id &&
                payment.Status == "Disputed")
            .ToList();
        if (disputedPayments.Count == 0)
            return Conflict(new ApiErrorDto("Không tìm thấy giao dịch đang được khiếu nại.", null));

        var now = DateTime.UtcNow;
        if (outcome == "CONFIRMED")
        {
            foreach (var payment in disputedPayments)
            {
                payment.Status = "Completed";
                payment.Paidat = now;
            }
            await FinalizeConfirmedRefundAsync(request, now);
            AddHistory(
                request,
                CurrentUserId(),
                "RefundDisputed",
                request.Status,
                $"Đối soát xác nhận tiền đã được ghi có: {dto.Note.Trim()}");
        }
        else
        {
            foreach (var payment in disputedPayments)
                payment.Status = "Failed";
            var completedAmount = request.Order.Orderpayments
                .Where(payment =>
                    payment.Transactiontype == "Refund" &&
                    payment.Returnrequestid == id &&
                    payment.Status == "Completed")
                .Sum(payment => payment.Amount);
            request.Refundamount = completedAmount;
            request.Refundstatus = completedAmount > 0 ? "PartiallyRefunded" : "Pending";
            request.Status = "RefundPending";
            request.Updatedat = now;
            AddHistory(
                request,
                CurrentUserId(),
                "RefundDisputed",
                "RefundPending",
                $"Đối soát xác nhận giao dịch thất bại; cần hoàn lại: {dto.Note.Trim()}");
        }

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();
        return Ok(await MapOneAsync(await RequestQuery().AsNoTracking().FirstAsync(item => item.Returnrequestid == id)));
    }

    [HttpPatch("{id:int}/cancel")]
    [Authorize(Roles = "Customer")]
    public async Task<ActionResult<ReturnRequestDto>> Cancel(int id)
    {
        var request = await _context.Returnrequests
            .Include(item => item.Order)
            .FirstOrDefaultAsync(item => item.Returnrequestid == id);
        if (request == null)
            return NotFound(new ApiErrorDto("Yêu cầu đổi trả không tồn tại.", null));
        if (request.Status != "PendingReview")
            return Conflict(new ApiErrorDto("Chỉ yêu cầu đang chờ duyệt mới được hủy.", null));
        if (request.Requestedbyuserid != CurrentUserId() && request.Order.Userid != CurrentUserId())
            return StatusCode(403, new ApiErrorDto("Bạn không có quyền hủy yêu cầu này.", null));

        var previous = request.Status;
        request.Status = "Cancelled";
        request.Refundstatus = "NotRequired";
        request.Completedat = DateTime.UtcNow;
        request.Updatedat = request.Completedat;
        AddHistory(request, CurrentUserId(), previous, request.Status, "Khách hàng hủy yêu cầu.");
        await _context.SaveChangesAsync();
        return Ok(await MapOneAsync(await RequestQuery().AsNoTracking().FirstAsync(item => item.Returnrequestid == id)));
    }

    private IQueryable<Returnrequest> RefundRequestQuery() =>
        _context.Returnrequests
            .Include(request => request.Order)
                .ThenInclude(order => order.Orderitems)
            .Include(request => request.Order)
                .ThenInclude(order => order.Orderpayments)
            .Include(request => request.Returnitems);

    private async Task FinalizeConfirmedRefundAsync(Returnrequest request, DateTime now)
    {
        var confirmedAmount = request.Order.Orderpayments
            .Where(payment =>
                payment.Transactiontype == "Refund" &&
                payment.Returnrequestid == request.Returnrequestid &&
                payment.Status == "Completed")
            .Sum(payment => payment.Amount);
        request.Refundamount = confirmedAmount;
        var approvedRefund = request.Approvedrefundamount ?? request.Requestedrefundamount;
        request.Refundstatus = confirmedAmount >= approvedRefund
            ? "Refunded"
            : "PartiallyRefunded";
        request.Status = request.Refundstatus == "Refunded" ? "Completed" : "RefundPending";
        request.Completedat = request.Status == "Completed" ? now : null;
        request.Updatedat = now;

        var totalConfirmedOrderRefunds = request.Order.Orderpayments
            .Where(payment => payment.Transactiontype == "Refund" && payment.Status == "Completed")
            .Sum(payment => payment.Amount);
        var paidAmount = request.Order.Paidamount ?? request.Order.Finalamount;
        request.Order.Paymentstatus = totalConfirmedOrderRefunds >= paidAmount
            ? "Refunded"
            : "PartiallyRefunded";

        if (request.Status != "Completed") return;
        var completedReturnedItemIds = await _context.Returnitems
            .Where(item =>
                item.Returnrequest.Orderid == request.Orderid &&
                item.Returnrequest.Requesttype == "Return" &&
                item.Returnrequest.Status == "Completed" &&
                item.Returnrequestid != request.Returnrequestid)
            .Select(item => item.Orderitemid)
            .Distinct()
            .ToListAsync();
        completedReturnedItemIds.AddRange(request.Returnitems.Select(item => item.Orderitemid));
        if (completedReturnedItemIds.Distinct().Count() >= request.Order.Orderitems.Count)
            request.Order.Orderstatus = "Returned";
    }

    private async Task ApplyReturnedInventoryAsync(
        Returnrequest request,
        Returnitem item,
        int? actorId,
        DateTime now)
    {
        var inventory = item.Inventoryitem;
        var previousStatus = inventory.Status;
        var disposition = NormalizeDisposition(item.Disposition ?? "Damaged");

        if (disposition == "Restock")
        {
            if (inventory.Variant == null)
                throw new InvalidOperationException($"IMEI {inventory.Imei} không có biến thể để nhập lại kho.");
            var resaleVariant = await ResolveResaleVariantAsync(
                inventory.Variant,
                item.Inspectiongrade ?? "Grade98");
            inventory.Variant = resaleVariant;
            item.Resalevariant = resaleVariant;
            inventory.Status = "InStock";
            inventory.Warrantystatus = "Returned";
        }
        else
        {
            inventory.Status = disposition == "Warranty" ? "Warranty" : "Damaged";
        }

        _context.Inventorytransactions.Add(new Inventorytransaction
        {
            Imei = inventory.Imei,
            Orderid = request.Orderid,
            Userid = actorId,
            Transactiontype = "CustomerReturn",
            Fromstatus = previousStatus,
            Tostatus = inventory.Status,
            Note = $"Return request #{request.Returnrequestid}: {disposition}; grade {item.Inspectiongrade}.",
            Createdat = now
        });
    }

    private async Task<Productvariant> ResolveResaleVariantAsync(
        Productvariant original,
        string inspectionGrade)
    {
        if (inspectionGrade.Equals("NewSeal", StringComparison.OrdinalIgnoreCase))
            return original;

        var condition = inspectionGrade.Equals("Grade99", StringComparison.OrdinalIgnoreCase)
            ? "Like New (99%)"
            : "Like New (98%)";
        var existing = await _context.Productvariants.FirstOrDefaultAsync(variant =>
            variant.Productid == original.Productid &&
            variant.Condition == condition &&
            variant.Specifications == original.Specifications);
        if (existing != null) return existing;

        var suffix = inspectionGrade.Equals("Grade99", StringComparison.OrdinalIgnoreCase) ? "99" : "98";
        var skuBase = $"RET-{original.Variantid}-{suffix}";
        var sku = skuBase;
        var sequence = 1;
        while (await _context.Productvariants.AnyAsync(variant => variant.Sku == sku))
            sku = $"{skuBase}-{sequence++}";

        var currentPrice = original.Saleprice ?? original.Baseprice;
        var resaleRate = suffix == "99" ? 0.90m : 0.85m;
        var resalePrice = decimal.Round(
            currentPrice * resaleRate / 1_000m,
            0,
            MidpointRounding.AwayFromZero) * 1_000m;
        var created = new Productvariant
        {
            Productid = original.Productid,
            Sku = sku,
            Imageurls = original.Imageurls,
            Baseprice = resalePrice,
            Saleprice = null,
            Condition = condition,
            Specifications = original.Specifications
        };
        _context.Productvariants.Add(created);
        return created;
    }

    private static string NormalizeDisposition(string disposition) =>
        Dispositions.First(item => item.Equals(disposition.Trim(), StringComparison.OrdinalIgnoreCase));

    private void AddHistory(
        Returnrequest request,
        int? userId,
        string? fromStatus,
        string toStatus,
        string? note,
        object? metadata = null)
    {
        _context.Statuslogs.Add(new Statuslog
        {
            Entitytype = "ReturnRequest",
            Entityid = request.Returnrequestid,
            Userid = userId,
            Fromstatus = fromStatus ?? string.Empty,
            Tostatus = toStatus,
            Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim(),
            Metadata = metadata == null ? null : JsonSerializer.Serialize(metadata),
            Createdat = DateTime.UtcNow
        });
    }
}
