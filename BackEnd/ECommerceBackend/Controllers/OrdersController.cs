using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Orders;

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
                i.Orderitemid, i.Orderid, i.Imei, i.Sellingprice, i.Warrantyprice, i.Packageid
            )).ToList();

            return new OrderListItemDto(
                o.Orderid, o.Customerid, o.Orderdate, o.Orderstatus, o.Totalamount, o.Discountamount, o.Finalamount, o.Paymentmethod, customer, items
            );
        }

        private static OrderDetailDto MapToDetailDto(Order o)
        {
            var customer = o.Customer != null ? new CustomerLiteDto(o.Customer.Customerid, o.Customer.Fullname, o.Customer.Phone, o.Customer.Email) : null;
            var items = o.Orderitems.Select(i => new OrderItemDto(
                i.Orderitemid, i.Orderid, i.Imei, i.Sellingprice, i.Warrantyprice, i.Packageid
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
                .Where(o => o.Userid == userId)
                .OrderByDescending(o => o.Orderdate)
                .ToListAsync();
            
            return Ok(orders.Select(MapToDto));
        }

        // POST: api/Orders
        [HttpPost]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<ActionResult<OrderDetailDto>> PostOrder([FromBody] CreateOrderRequestDto dto)
        {
            // For P0, we bypass full inventory deduction and directly create the order structure
            // to fulfill the payload fix. P2 will handle the full domain logic.
            
            var order = new Order
            {
                Userid = dto.Userid,
                Orderstatus = "Pending",
                Paymentmethod = dto.Paymentmethod,
                Vouchercode = dto.Vouchercode,
                Orderdate = DateTime.UtcNow,
                Totalamount = 0, // This should be computed server-side
                Finalamount = 0  // This should be computed server-side
            };

            // In P0, we map Items but leave prices to be updated
            if (dto.Items != null && dto.Items.Any())
            {
                foreach (var item in dto.Items)
                {
                    // A proper implementation would fetch ProductVariant and use its price
                    var variant = await _context.Productvariants.FindAsync(item.Variantid);
                    if (variant != null)
                    {
                        decimal price = variant.Saleprice ?? variant.Baseprice;
                        for (int i = 0; i < item.Quantity; i++)
                        {
                            order.Orderitems.Add(new Orderitem
                            {
                                Sellingprice = price
                            });
                            order.Totalamount += price;
                        }
                    }
                }
                order.Finalamount = order.Totalamount; // Ignoring discount for P0 simple mapping
            }

            _context.Orders.Add(order);
            await _context.SaveChangesAsync();
            
            var created = await _context.Orders
                .Include(o => o.Customer)
                .Include(o => o.Orderitems)
                .FirstOrDefaultAsync(o => o.Orderid == order.Orderid);

            return CreatedAtAction(nameof(GetOrder), new { id = order.Orderid }, MapToDetailDto(created!));
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
            var order = await _context.Orders.FindAsync(id);
            if (order == null) return NotFound();
            order.Orderstatus = dto.Status;
            await _context.SaveChangesAsync();
            return Ok(new UpdateOrderStatusResponseDto(order.Orderid, order.Orderstatus));
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
