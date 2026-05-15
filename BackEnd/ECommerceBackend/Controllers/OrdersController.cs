using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OrdersController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public OrdersController(ECommerceContext context) => _context = context;

        // GET: api/Orders
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Order>>> GetOrders()
            => await _context.Orders
                .Include(o => o.Customer)
                .Include(o => o.Orderitems)
                .ToListAsync();

        // GET: api/Orders/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Order>> GetOrder(int id)
        {
            var order = await _context.Orders
                .Include(o => o.Customer)
                .Include(o => o.Orderitems)
                    .ThenInclude(oi => oi.ImeiNavigation)
                        .ThenInclude(inv => inv!.Variant)
                            .ThenInclude(v => v!.Product)
                .FirstOrDefaultAsync(o => o.Orderid == id);
            if (order == null) return NotFound();
            return order;
        }

        // GET: api/Orders/customer/5
        [HttpGet("customer/{customerId}")]
        public async Task<ActionResult<IEnumerable<Order>>> GetOrdersByCustomer(int customerId)
            => await _context.Orders
                .Include(o => o.Orderitems)
                .Where(o => o.Customerid == customerId)
                .OrderByDescending(o => o.Orderdate)
                .ToListAsync();

        // POST: api/Orders
        [HttpPost]
        public async Task<ActionResult<Order>> PostOrder(Order order)
        {
            _context.Orders.Add(order);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetOrder), new { id = order.Orderid }, order);
        }

        // PUT: api/Orders/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutOrder(int id, Order order)
        {
            if (id != order.Orderid) return BadRequest();
            _context.Entry(order).State = EntityState.Modified;
            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Orders.Any(e => e.Orderid == id)) return NotFound();
                throw;
            }
            return NoContent();
        }

        // PATCH: api/Orders/5/status
        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] string status)
        {
            var order = await _context.Orders.FindAsync(id);
            if (order == null) return NotFound();
            order.Orderstatus = status;
            await _context.SaveChangesAsync();
            return Ok(new { order.Orderid, order.Orderstatus });
        }

        // DELETE: api/Orders/5
        [HttpDelete("{id}")]
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
