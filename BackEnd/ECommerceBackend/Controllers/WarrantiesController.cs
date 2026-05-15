using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class WarrantiesController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public WarrantiesController(ECommerceContext context) => _context = context;

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Warranty>>> GetWarranties()
            => await _context.Warranties.Include(w => w.Customer).ToListAsync();

        [HttpGet("{id}")]
        public async Task<ActionResult<Warranty>> GetWarranty(int id)
        {
            var w = await _context.Warranties.Include(w => w.Customer).FirstOrDefaultAsync(w => w.Warrantyid == id);
            if (w == null) return NotFound();
            return w;
        }

        [HttpGet("customer/{customerId}")]
        public async Task<ActionResult<IEnumerable<Warranty>>> GetWarrantiesByCustomer(int customerId)
            => await _context.Warranties.Where(w => w.Customerid == customerId).ToListAsync();

        [HttpPost]
        public async Task<ActionResult<Warranty>> PostWarranty(Warranty warranty)
        {
            _context.Warranties.Add(warranty);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetWarranty), new { id = warranty.Warrantyid }, warranty);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutWarranty(int id, Warranty warranty)
        {
            if (id != warranty.Warrantyid) return BadRequest();
            _context.Entry(warranty).State = EntityState.Modified;
            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Warranties.Any(e => e.Warrantyid == id)) return NotFound();
                throw;
            }
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteWarranty(int id)
        {
            var warranty = await _context.Warranties.FindAsync(id);
            if (warranty == null) return NotFound();
            _context.Warranties.Remove(warranty);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
