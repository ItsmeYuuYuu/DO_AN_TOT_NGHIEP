using System.Text.Json;
using ECommerceBackend.DTOs.Common;
using ECommerceBackend.DTOs.Returns;
using ECommerceBackend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ECommerceBackend.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Admin,Manager,Sales,Warehouse,Customer")]
public class ReturnRequestsController : ControllerBase
{
    private static readonly HashSet<string> RequestTypes =
        new(StringComparer.OrdinalIgnoreCase) { "Return", "Exchange" };
    private static readonly HashSet<string> Dispositions =
        new(StringComparer.OrdinalIgnoreCase) { "Restock", "Warranty", "Damaged" };
    private static readonly HashSet<string> TerminalStatuses =
        new(StringComparer.OrdinalIgnoreCase) { "Rejected", "Cancelled", "Completed" };

    private readonly ECommerceContext _context;

    public ReturnRequestsController(ECommerceContext context)
    {
        _context = context;
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

    private IQueryable<Returnrequest> RequestQuery() =>
        _context.Returnrequests
            .Include(request => request.Order)
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
            request.Reason,
            request.Description,
            request.Status,
            DeserializeImages(request.Imageurls),
            request.Reviewnote,
            request.Resolution,
            request.Requestedrefundamount,
            request.Refundamount,
            request.Refundstatus,
            DeserializeRefundDestination(request.Refundinfo),
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
                    item.Refundamount))
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

    [HttpGet]
    [Authorize(Roles = "Admin,Manager,Sales,Warehouse")]
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
    [Authorize(Roles = "Admin,Manager")]
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

        var order = await _context.Orders
            .Include(item => item.Customer)
            .Include(item => item.Orderitems)
                .ThenInclude(item => item.ImeiNavigation)
            .FirstOrDefaultAsync(item => item.Orderid == dto.Orderid);
        if (order == null)
            return NotFound(new ApiErrorDto("Đơn hàng không tồn tại.", null));
        if (order.Orderstatus != "Completed")
            return BadRequest(new ApiErrorDto("Chỉ đơn hàng đã hoàn thành mới được yêu cầu đổi trả.", null));
        if (order.Orderdate.HasValue && order.Orderdate.Value < DateTime.UtcNow.AddDays(-30))
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

        var now = DateTime.UtcNow;
        var requestedRefund = requestType.Equals("Return", StringComparison.OrdinalIgnoreCase)
            ? selectedItems.Sum(item => item.Sellingprice + (item.Warrantyprice ?? 0))
            : 0;
        var request = new Returnrequest
        {
            Orderid = order.Orderid,
            Customerid = order.Customerid,
            Requestedbyuserid = currentUserId,
            Requesttype = requestType,
            Reason = dto.Reason.Trim(),
            Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
            Status = "PendingReview",
            Imageurls = JsonSerializer.Serialize(imageUrls),
            Requestedrefundamount = requestedRefund,
            Refundstatus = requestedRefund > 0 ? "Pending" : "NotRequired",
            Refundinfo = refundDestination == null ? null : JsonSerializer.Serialize(refundDestination),
            Requestedat = now,
            Updatedat = now
        };
        foreach (var item in selectedItems)
        {
            request.Returnitems.Add(new Returnitem
            {
                Orderitemid = item.Orderitemid,
                Imei = item.Imei!,
                Refundamount = requestType.Equals("Return", StringComparison.OrdinalIgnoreCase)
                    ? item.Sellingprice + (item.Warrantyprice ?? 0)
                    : 0
            });
        }
        _context.Returnrequests.Add(request);
        await _context.SaveChangesAsync();

        _context.Statuslogs.Add(new Statuslog
        {
            Entitytype = "ReturnRequest",
            Entityid = request.Returnrequestid,
            Userid = currentUserId,
            Tostatus = "PendingReview",
            Note = "Khách hàng gửi yêu cầu đổi trả.",
            Createdat = now
        });

        await _context.SaveChangesAsync();

        var created = await RequestQuery().AsNoTracking()
            .FirstAsync(item => item.Returnrequestid == request.Returnrequestid);
        return CreatedAtAction(
            nameof(GetRequest),
            new { id = request.Returnrequestid },
            await MapOneAsync(created));
    }

    [HttpPost("{id:int}/claim")]
    [Authorize(Roles = "Sales")]
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
    [Authorize(Roles = "Admin,Manager")]
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
    [Authorize(Roles = "Admin,Manager,Sales")]
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
    [Authorize(Roles = "Admin,Manager,Warehouse")]
    public async Task<ActionResult<ReturnRequestDto>> Receive(int id, ReceiveReturnRequestDto dto)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync();
        var request = await _context.Returnrequests
            .Include(item => item.Order)
                .ThenInclude(order => order.Orderitems)
            .Include(item => item.Returnitems)
                .ThenInclude(item => item.Orderitem)
            .Include(item => item.Returnitems)
                .ThenInclude(item => item.Inventoryitem)
            .FirstOrDefaultAsync(item => item.Returnrequestid == id);
        if (request == null)
            return NotFound(new ApiErrorDto("Yêu cầu đổi trả không tồn tại.", null));
        if (request.Status != "Approved")
            return Conflict(new ApiErrorDto("Yêu cầu phải được duyệt trước khi kho tiếp nhận.", null));
        if (dto.Items.Count != request.Returnitems.Count)
            return BadRequest(new ApiErrorDto("Cần kiểm tra đầy đủ tất cả IMEI trong phiếu.", null));

        var payload = dto.Items.ToDictionary(item => item.Returnitemid);
        if (request.Returnitems.Any(item => !payload.ContainsKey(item.Returnitemid)))
            return BadRequest(new ApiErrorDto("Danh sách IMEI tiếp nhận không khớp với phiếu.", null));

        var actorId = CurrentUserId();
        var now = DateTime.UtcNow;
        foreach (var item in request.Returnitems)
        {
            var input = payload[item.Returnitemid];
            if (!Dispositions.Contains(input.Disposition))
                return BadRequest(new ApiErrorDto("Phân loại máy chỉ nhận Restock, Warranty hoặc Damaged.", null));
            if (string.IsNullOrWhiteSpace(input.Condition))
                return BadRequest(new ApiErrorDto($"Cần nhập tình trạng cho IMEI {item.Imei}.", null));

            var original = item.Inventoryitem;
            var previousStatus = original.Status;
            var disposition = NormalizeDisposition(input.Disposition);
            original.Status = disposition switch
            {
                "Restock" => "InStock",
                "Warranty" => "Warranty",
                _ => "Damaged"
            };
            original.Warrantystatus = disposition == "Restock" ? "Returned" : original.Warrantystatus;
            item.Condition = input.Condition.Trim();
            item.Disposition = disposition;

            _context.Inventorytransactions.Add(new Inventorytransaction
            {
                Imei = original.Imei,
                Orderid = request.Orderid,
                Userid = actorId,
                Transactiontype = "CustomerReturn",
                Fromstatus = previousStatus,
                Tostatus = original.Status,
                Note = $"Return request #{request.Returnrequestid}: {disposition}.",
                Createdat = now
            });

            if (request.Requesttype.Equals("Exchange", StringComparison.OrdinalIgnoreCase))
            {
                if (string.IsNullOrWhiteSpace(input.Replacementimei))
                    return BadRequest(new ApiErrorDto($"Cần chọn IMEI thay thế cho {item.Imei}.", null));

                var replacement = await _context.Inventoryitems
                    .FirstOrDefaultAsync(inventory => inventory.Imei == input.Replacementimei.Trim());
                if (replacement == null ||
                    replacement.Status != "InStock" ||
                    replacement.Variantid != original.Variantid)
                {
                    return BadRequest(new ApiErrorDto(
                        $"IMEI thay thế cho {item.Imei} phải cùng biến thể và đang còn trong kho.",
                        null));
                }

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
                var maximumRefund = item.Orderitem.Sellingprice + (item.Orderitem.Warrantyprice ?? 0);
                var refund = input.Refundamount ?? maximumRefund;
                if (refund < 0 || refund > maximumRefund)
                    return BadRequest(new ApiErrorDto($"Số tiền hoàn cho {item.Imei} không hợp lệ.", null));
                item.Refundamount = refund;
            }
        }

        var previous = request.Status;
        request.Receivedat = now;
        request.Resolution = string.IsNullOrWhiteSpace(dto.Resolution) ? null : dto.Resolution.Trim();
        request.Updatedat = now;
        if (request.Requesttype.Equals("Return", StringComparison.OrdinalIgnoreCase))
        {
            request.Requestedrefundamount = request.Returnitems.Sum(item => item.Refundamount);
            request.Status = request.Requestedrefundamount > 0 ? "RefundPending" : "Completed";
            request.Refundstatus = request.Requestedrefundamount > 0 ? "Pending" : "NotRequired";
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

    [HttpPost("{id:int}/refund")]
    [Authorize(Roles = "Admin,Manager,Sales")]
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
        var remaining = request.Requestedrefundamount - reservedBefore;
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
    [Authorize(Roles = "Admin,Manager,Sales")]
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
        request.Refundstatus = confirmedAmount >= request.Requestedrefundamount
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
