using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Orders;
using ECommerceBackend.DTOs.Common;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OrdersController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public OrdersController(ECommerceContext context) => _context = context;

        private static OrderListItemDto MapToDto(Order o)
        {
            var customer = o.Customer != null ? new CustomerLiteDto(o.Customer.Customerid, o.Customer.Fullname, o.Customer.Phone, o.Customer.Email) : null;
            var items = o.Orderitems.Select(i => new OrderItemDto(
                i.Orderitemid, i.Orderid, i.Imei, i.Sellingprice, i.Warrantyprice, i.Packageid, i.Package?.Packagename,
                i.ImeiNavigation?.Variant?.Product?.Productname, i.ImeiNavigation?.Variant?.Sku
            )).ToList();

            return new OrderListItemDto(
                o.Orderid, o.Customerid, o.Orderdate, o.Orderstatus, o.Totalamount, o.Discountamount, o.Finalamount, o.Paymentmethod, customer, items
            );
        }

        private static OrderDetailDto MapToDetailDto(Order o)
        {
            var customer = o.Customer != null ? new CustomerLiteDto(o.Customer.Customerid, o.Customer.Fullname, o.Customer.Phone, o.Customer.Email) : null;
            var items = o.Orderitems.Select(i => new OrderItemDto(
                i.Orderitemid, i.Orderid, i.Imei, i.Sellingprice, i.Warrantyprice, i.Packageid, i.Package?.Packagename,
                i.ImeiNavigation?.Variant?.Product?.Productname, i.ImeiNavigation?.Variant?.Sku
            )).ToList();

            return new OrderDetailDto(
                o.Orderid, o.Customerid, o.Orderdate, o.Orderstatus, o.Totalamount, o.Discountamount, o.Finalamount, o.Paymentmethod, customer, items
            );
        }

        // GET: api/Orders
        [HttpGet]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,Staff")]
        public async Task<ActionResult<IEnumerable<OrderListItemDto>>> GetOrders()
        {
            var orders = await _context.Orders
                .Include(o => o.Customer)
                .Include(o => o.Orderitems)
                    .ThenInclude(oi => oi.Package)
                .Include(o => o.Orderitems)
                    .ThenInclude(oi => oi.ImeiNavigation)
                        .ThenInclude(inv => inv!.Variant)
                            .ThenInclude(v => v!.Product)
                .ToListAsync();
            
            return Ok(orders.Select(MapToDto));
        }

        // GET: api/Orders/5
        [HttpGet("{id}")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,Staff")]
        public async Task<ActionResult<OrderDetailDto>> GetOrder(int id)
        {
            var order = await _context.Orders
                .Include(o => o.Customer)
                .Include(o => o.Orderitems)
                    .ThenInclude(oi => oi.Package)
                .Include(o => o.Orderitems)
                    .ThenInclude(oi => oi.ImeiNavigation)
                        .ThenInclude(inv => inv!.Variant)
                            .ThenInclude(v => v!.Product)
                .FirstOrDefaultAsync(o => o.Orderid == id);
            
            if (order == null) return NotFound();
            return Ok(MapToDetailDto(order));
        }

        // GET: api/Orders/customer/5
        [HttpGet("customer/{customerId}")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,Staff")]
        public async Task<ActionResult<IEnumerable<OrderListItemDto>>> GetOrdersByCustomer(int customerId)
        {
            var orders = await _context.Orders
                .Include(o => o.Orderitems)
                    .ThenInclude(oi => oi.Package)
                .Include(o => o.Orderitems)
                    .ThenInclude(oi => oi.ImeiNavigation)
                        .ThenInclude(inv => inv!.Variant)
                            .ThenInclude(v => v!.Product)
                .Where(o => o.Customerid == customerId)
                .OrderByDescending(o => o.Orderdate)
                .ToListAsync();
            
            return Ok(orders.Select(MapToDto));
        }

        // GET: api/Orders/user/5
        [HttpGet("user/{userId}")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<ActionResult<IEnumerable<OrderListItemDto>>> GetOrdersByUser(int userId)
        {
            var isStaffOrAdmin = User.IsInRole("Admin") || User.IsInRole("Staff");
            var claimUserId = User.FindFirst("userid")?.Value;
            
            if (!isStaffOrAdmin && claimUserId != userId.ToString())
            {
                return Forbid();
            }

            var orders = await _context.Orders
                .Include(o => o.Orderitems)
                    .ThenInclude(oi => oi.Package)
                .Include(o => o.Orderitems)
                    .ThenInclude(oi => oi.ImeiNavigation)
                        .ThenInclude(inv => inv!.Variant)
                            .ThenInclude(v => v!.Product)
                .Where(o => o.Userid == userId)
                .OrderByDescending(o => o.Orderdate)
                .ToListAsync();
            
            return Ok(orders.Select(MapToDto));
        }

        // GET: api/Orders/lookup?phone=&orderid= — public, no auth, limited fields only
        [HttpGet("lookup")]
        public async Task<ActionResult<IEnumerable<OrderLookupDto>>> LookupOrders(
            [FromQuery] string? phone,
            [FromQuery] int? orderid)
        {
            if (string.IsNullOrWhiteSpace(phone))
                return BadRequest(new ApiErrorDto("Vui lòng nhập số điện thoại để tra cứu.", null));

            var query = _context.Orders
                .Include(o => o.Customer)
                .Where(o => o.Customer != null && o.Customer.Phone == phone);

            if (orderid.HasValue)
                query = query.Where(o => o.Orderid == orderid);

            var orders = await query
                .OrderByDescending(o => o.Orderdate)
                .Take(20) // safety cap
                .ToListAsync();

            // Return limited safe fields — no IMEI, no internal details
            var result = orders.Select(o => new OrderLookupDto(
                o.Orderid,
                o.Orderdate,
                o.Orderstatus,
                o.Totalamount,
                o.Discountamount,
                o.Finalamount,
                o.Paymentmethod,
                o.Vouchercode,
                o.Orderitems.Count
            ));

            return Ok(result);
        }


        [HttpPost]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<ActionResult<OrderDetailDto>> PostOrder([FromBody] CreateOrderRequestDto dto)
        {
            var claimUserIdStr = User.FindFirst("userid")?.Value;
            int claimUserId = 0;
            if (!string.IsNullOrEmpty(claimUserIdStr)) int.TryParse(claimUserIdStr, out claimUserId);
            
            var isStaffOrAdmin = User.IsInRole("Admin") || User.IsInRole("Staff");
            
            int userId = claimUserId;
            if (dto.Userid.HasValue && dto.Userid.Value != claimUserId)
            {
                if (!isStaffOrAdmin)
                {
                    return StatusCode(403, new ApiErrorDto("Bạn không có quyền tạo đơn hàng cho người dùng khác.", null));
                }
                userId = dto.Userid.Value;
            }
            
            if (userId == 0) 
                return BadRequest(new ApiErrorDto("Không xác định được User.", null));
                
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Identity Mapping
                var user = await _context.Users.FindAsync(userId);
                if (user == null) 
                    return BadRequest(new ApiErrorDto("User không tồn tại.", null));
                    
                Customer? customer = null;
                if (!string.IsNullOrEmpty(user.Email))
                    customer = await _context.Customers.FirstOrDefaultAsync(c => c.Email == user.Email);
                if (customer == null && !string.IsNullOrEmpty(user.Phone))
                    customer = await _context.Customers.FirstOrDefaultAsync(c => c.Phone == user.Phone);
                    
                if (customer == null)
                {
                    if (string.IsNullOrEmpty(user.Email) && string.IsNullOrEmpty(user.Phone))
                    {
                        return BadRequest(new ApiErrorDto("Vui lòng cập nhật Email hoặc Phone trong Profile trước khi đặt hàng.", null));
                    }
                    customer = new Customer
                    {
                        Fullname = user.Fullname,
                        Email = user.Email,
                        Phone = user.Phone ?? "N/A", // Phone is required, fallback if only email is provided
                        Createdat = DateTime.UtcNow
                    };
                    _context.Customers.Add(customer);
                    await _context.SaveChangesAsync();
                }

                // 2. Initialize Order
                var order = new Order
                {
                    Userid = user.Userid,
                    Customerid = customer.Customerid,
                    Orderstatus = "Pending",
                    Paymentmethod = dto.Paymentmethod,
                    Vouchercode = dto.Vouchercode,
                    Orderdate = DateTime.UtcNow,
                    Totalamount = 0,
                    Discountamount = 0,
                    Finalamount = 0
                };

                // 3. Inventory Allocation & Items
                foreach (var reqItem in dto.Items)
                {
                    var variant = await _context.Productvariants.FindAsync(reqItem.Variantid);
                    if (variant == null)
                        return BadRequest(new ApiErrorDto($"VariantId {reqItem.Variantid} không tồn tại.", null));
                        
                    var availableItems = await _context.Inventoryitems
                        .Where(i => i.Variantid == reqItem.Variantid && i.Status == "InStock")
                        .OrderBy(i => i.Importedat)
                        .Take(reqItem.Quantity)
                        .ToListAsync();
                        
                    if (availableItems.Count < reqItem.Quantity)
                        return BadRequest(new ApiErrorDto($"Sản phẩm (VariantId: {reqItem.Variantid}) không đủ tồn kho (Chỉ còn {availableItems.Count}).", null));

                    decimal price = variant.Saleprice ?? variant.Baseprice;
                    Warrantypackage? package = null;
                    if (reqItem.Packageid.HasValue)
                    {
                        package = await _context.Warrantypackages.FindAsync(reqItem.Packageid);
                        if (package == null) 
                            return BadRequest(new ApiErrorDto($"Gói bảo hành ID {reqItem.Packageid} không tồn tại.", null));
                    }
                    decimal packagePrice = package?.Price ?? 0;
                    
                    foreach (var invItem in availableItems)
                    {
                        invItem.Status = "Sold";
                        
                        var orderItem = new Orderitem
                        {
                            Imei = invItem.Imei,
                            Sellingprice = price,
                            Packageid = package?.Packageid,
                            Warrantyprice = packagePrice > 0 ? packagePrice : null
                        };
                        order.Orderitems.Add(orderItem);
                        order.Totalamount += price + packagePrice;
                    }
                }

                // 4. Voucher Logic
                if (!string.IsNullOrEmpty(dto.Vouchercode))
                {
                    var voucher = await _context.Vouchers.FirstOrDefaultAsync(v => v.Vouchercode == dto.Vouchercode && v.Isactive == true);
                    if (voucher == null)
                        return BadRequest(new ApiErrorDto("Voucher không hợp lệ hoặc không hoạt động.", null));
                    
                    if (voucher.Validfrom.HasValue && voucher.Validfrom > DateTime.UtcNow)
                         return BadRequest(new ApiErrorDto("Voucher chưa đến thời gian áp dụng.", null));
                    if (voucher.Validto.HasValue && voucher.Validto < DateTime.UtcNow)
                         return BadRequest(new ApiErrorDto("Voucher đã hết hạn.", null));

                    if (voucher.Discountpercentage.HasValue && voucher.Discountpercentage > 0)
                    {
                        order.Discountamount = order.Totalamount * (decimal)(voucher.Discountpercentage / 100.0);
                    }
                    else if (voucher.Discountamount.HasValue && voucher.Discountamount > 0)
                    {
                        order.Discountamount = voucher.Discountamount.Value;
                    }
                }

                order.Finalamount = Math.Max(0, order.Totalamount - (order.Discountamount ?? 0));

                _context.Orders.Add(order);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                var created = await _context.Orders
                    .Include(o => o.Customer)
                    .Include(o => o.Orderitems)
                        .ThenInclude(oi => oi.Package)
                    .FirstOrDefaultAsync(o => o.Orderid == order.Orderid);

                return CreatedAtAction(nameof(GetOrder), new { id = order.Orderid }, MapToDetailDto(created!));
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new ApiErrorDto("Lỗi hệ thống khi tạo đơn hàng.", new Dictionary<string, string[]> { { "Error", new[] { ex.Message } } }));
            }
        }

        // PUT: api/Orders/5
        [HttpPut("{id}")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> PutOrder(int id, [FromBody] UpdateOrderRequestDto dto)
        {
            var order = await _context.Orders.FindAsync(id);
            if (order == null) return NotFound();

            order.Paymentmethod = dto.Paymentmethod;
            order.Vouchercode = dto.Vouchercode;

            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Orders.Any(e => e.Orderid == id)) return NotFound();
                throw;
            }

            var updated = await _context.Orders
                .Include(o => o.Customer)
                .Include(o => o.Orderitems)
                .FirstOrDefaultAsync(o => o.Orderid == order.Orderid);

            return Ok(MapToDetailDto(updated!));
        }

        // PATCH: api/Orders/5/status
        [HttpPatch("{id}/status")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateOrderStatusRequestDto dto)
        {
            var validTransitions = new Dictionary<string, string[]>
            {
                { "Pending", new[] { "Processing", "Cancelled" } },
                { "Processing", new[] { "Shipped", "Cancelled" } },
                { "Shipped", new[] { "Completed", "Cancelled" } }
            };

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var order = await _context.Orders
                    .Include(o => o.Orderitems)
                    .FirstOrDefaultAsync(o => o.Orderid == id);
                    
                if (order == null) return NotFound();
                
                string currentStatus = order.Orderstatus ?? "Pending";
                string newStatus = dto.Status;
                
                if (currentStatus == "Cancelled" || currentStatus == "Completed")
                {
                    return BadRequest(new ApiErrorDto($"Đơn hàng đã ở trạng thái kết thúc ({currentStatus}) và không thể thay đổi.", null));
                }

                if (!validTransitions.ContainsKey(currentStatus) || !validTransitions[currentStatus].Contains(newStatus))
                {
                    return BadRequest(new ApiErrorDto($"Không thể chuyển trạng thái từ '{currentStatus}' sang '{newStatus}'.", null));
                }

                if (newStatus == "Cancelled")
                {
                    // Hoàn tồn kho
                    var imeis = order.Orderitems.Where(i => i.Imei != null).Select(i => i.Imei).ToList();
                    if (imeis.Any())
                    {
                        var inventoryItems = await _context.Inventoryitems.Where(i => imeis.Contains(i.Imei)).ToListAsync();
                        foreach(var inv in inventoryItems)
                        {
                            inv.Status = "InStock";
                        }
                    }
                }

                order.Orderstatus = newStatus;
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new UpdateOrderStatusResponseDto(order.Orderid, order.Orderstatus));
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new ApiErrorDto("Lỗi khi cập nhật trạng thái đơn hàng.", new Dictionary<string, string[]> { { "Error", new[] { ex.Message } } }));
            }
        }

        // POST: api/Orders/bulk-status
        [HttpPost("bulk-status")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> BulkUpdateStatus([FromBody] BulkUpdateStatusRequestDto dto, [FromServices] ILogger<OrdersController> logger)
        {
            var validTransitions = new Dictionary<string, string[]>
            {
                { "Pending", new[] { "Processing", "Cancelled" } },
                { "Processing", new[] { "Shipped", "Cancelled" } },
                { "Shipped", new[] { "Completed", "Cancelled" } }
            };

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var orders = await _context.Orders
                    .Include(o => o.Orderitems)
                    .Where(o => dto.OrderIds.Contains(o.Orderid))
                    .ToListAsync();

                if (!orders.Any())
                    return BadRequest(new ApiErrorDto("Không tìm thấy đơn hàng nào.", null));

                var updatedOrderIds = new List<int>();
                var failed = new List<BulkUpdateFailedItemDto>();

                foreach (var order in orders)
                {
                    string currentStatus = order.Orderstatus ?? "Pending";
                    string newStatus = dto.Status;

                    if (currentStatus == "Cancelled" || currentStatus == "Completed")
                    {
                        failed.Add(new BulkUpdateFailedItemDto(order.Orderid, $"Đơn hàng đã ở trạng thái kết thúc ({currentStatus})."));
                        continue;
                    }

                    if (!validTransitions.ContainsKey(currentStatus) || !validTransitions[currentStatus].Contains(newStatus))
                    {
                        failed.Add(new BulkUpdateFailedItemDto(order.Orderid, $"Không thể chuyển từ '{currentStatus}' sang '{newStatus}'."));
                        continue;
                    }

                    if (newStatus == "Cancelled")
                    {
                        // Hoàn tồn kho
                        var imeis = order.Orderitems.Where(i => i.Imei != null).Select(i => i.Imei).ToList();
                        if (imeis.Any())
                        {
                            var inventoryItems = await _context.Inventoryitems.Where(i => imeis.Contains(i.Imei)).ToListAsync();
                            foreach (var inv in inventoryItems)
                            {
                                inv.Status = "InStock";
                            }
                        }
                    }

                    order.Orderstatus = newStatus;
                    updatedOrderIds.Add(order.Orderid);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                string message = failed.Any() 
                    ? $"Cập nhật thành công {updatedOrderIds.Count} đơn hàng, {failed.Count} lỗi."
                    : $"Đã cập nhật thành công {updatedOrderIds.Count} đơn hàng.";

                return Ok(new BulkUpdateStatusResponseDto(updatedOrderIds, failed, message));
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Lỗi hệ thống khi cập nhật trạng thái đơn hàng hàng loạt.");
                await transaction.RollbackAsync();
                return StatusCode(500, new ApiErrorDto("Lỗi hệ thống khi cập nhật trạng thái.", null));
            }
        }

        // DELETE: api/Orders/5
        [HttpDelete("{id}")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteOrder(int id)
        {
            var order = await _context.Orders.FindAsync(id);
            if (order == null) return NotFound();
            _context.Orders.Remove(order);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
