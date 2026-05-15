using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProductVariantsController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public ProductVariantsController(ECommerceContext context) => _context = context;

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Productvariant>>> GetProductVariants()
            => await _context.Productvariants
                .Include(v => v.Product)
                .Include(v => v.Condition)
                .Include(v => v.Productimages)
                .ToListAsync();

        [HttpGet("{id}")]
        public async Task<ActionResult<Productvariant>> GetProductVariant(int id)
        {
            var variant = await _context.Productvariants
                .Include(v => v.Product)
                .Include(v => v.Condition)
                .Include(v => v.Productimages)
                .Include(v => v.Values)
                .FirstOrDefaultAsync(v => v.Variantid == id);
            if (variant == null) return NotFound();
            return variant;
        }

        [HttpGet("product/{productId}")]
        public async Task<ActionResult<IEnumerable<Productvariant>>> GetVariantsByProduct(int productId)
            => await _context.Productvariants
                .Include(v => v.Condition)
                .Include(v => v.Productimages)
                .Where(v => v.Productid == productId)
                .ToListAsync();

        [HttpPost]
        public async Task<ActionResult<Productvariant>> PostProductVariant(Productvariant variant)
        {
            _context.Productvariants.Add(variant);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetProductVariant), new { id = variant.Variantid }, variant);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutProductVariant(int id, Productvariant variant)
        {
            if (id != variant.Variantid) return BadRequest();
            _context.Entry(variant).State = EntityState.Modified;
            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Productvariants.Any(e => e.Variantid == id)) return NotFound();
                throw;
            }
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProductVariant(int id)
        {
            var variant = await _context.Productvariants.FindAsync(id);
            if (variant == null) return NotFound();
            _context.Productvariants.Remove(variant);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
