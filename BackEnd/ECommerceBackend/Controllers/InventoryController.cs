using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class InventoryController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public InventoryController(ECommerceContext context) => _context = context;

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Inventoryitem>>> GetInventoryItems()
            => await _context.Inventoryitems.Include(i => i.Variant).ThenInclude(v => v!.Product).ToListAsync();

        [HttpGet("{imei}")]
        public async Task<ActionResult<Inventoryitem>> GetInventoryItem(string imei)
        {
            var item = await _context.Inventoryitems.Include(i => i.Variant)
                .FirstOrDefaultAsync(i => i.Imei == imei);
            if (item == null) return NotFound();
            return item;
        }

        [HttpGet("variant/{variantId}")]
        public async Task<ActionResult<IEnumerable<Inventoryitem>>> GetByVariant(int variantId)
            => await _context.Inventoryitems.Where(i => i.Variantid == variantId).ToListAsync();

        [HttpGet("status/{status}")]
        public async Task<ActionResult<IEnumerable<Inventoryitem>>> GetByStatus(string status)
            => await _context.Inventoryitems
                .Include(i => i.Variant).ThenInclude(v => v!.Product)
                .Where(i => i.Status == status)
                .ToListAsync();

        [HttpPost]
        public async Task<ActionResult<Inventoryitem>> PostInventoryItem(Inventoryitem item)
        {
            _context.Inventoryitems.Add(item);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetInventoryItem), new { imei = item.Imei }, item);
        }

        [HttpPut("{imei}")]
        public async Task<IActionResult> PutInventoryItem(string imei, Inventoryitem item)
        {
            if (imei != item.Imei) return BadRequest();
            _context.Entry(item).State = EntityState.Modified;
            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Inventoryitems.Any(e => e.Imei == imei)) return NotFound();
                throw;
            }
            return NoContent();
        }

        [HttpDelete("{imei}")]
        public async Task<IActionResult> DeleteInventoryItem(string imei)
        {
            var item = await _context.Inventoryitems.FindAsync(imei);
            if (item == null) return NotFound();
            _context.Inventoryitems.Remove(item);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
