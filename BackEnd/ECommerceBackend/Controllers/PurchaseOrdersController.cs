using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PurchaseOrdersController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public PurchaseOrdersController(ECommerceContext context) => _context = context;

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Purchaseorder>>> GetPurchaseOrders()
            => await _context.Purchaseorders.Include(p => p.Supplier).Include(p => p.User).ToListAsync();

        [HttpGet("{id}")]
        public async Task<ActionResult<Purchaseorder>> GetPurchaseOrder(int id)
        {
            var po = await _context.Purchaseorders
                .Include(p => p.Supplier)
                .Include(p => p.User)
                .Include(p => p.Purchaseorderdetails).ThenInclude(d => d.Variant).ThenInclude(v => v!.Product)
                .FirstOrDefaultAsync(p => p.Poid == id);
            if (po == null) return NotFound();
            return po;
        }

        [HttpPost]
        public async Task<ActionResult<Purchaseorder>> PostPurchaseOrder(Purchaseorder po)
        {
            _context.Purchaseorders.Add(po);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetPurchaseOrder), new { id = po.Poid }, po);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutPurchaseOrder(int id, Purchaseorder po)
        {
            if (id != po.Poid) return BadRequest();
            _context.Entry(po).State = EntityState.Modified;
            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Purchaseorders.Any(e => e.Poid == id)) return NotFound();
                throw;
            }
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePurchaseOrder(int id)
        {
            var po = await _context.Purchaseorders.FindAsync(id);
            if (po == null) return NotFound();
            _context.Purchaseorders.Remove(po);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
