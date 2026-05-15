using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BrandsController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public BrandsController(ECommerceContext context) => _context = context;

        // GET: api/Brands
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Brand>>> GetBrands()
            => await _context.Brands.ToListAsync();

        // GET: api/Brands/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Brand>> GetBrand(int id)
        {
            var brand = await _context.Brands.FindAsync(id);
            if (brand == null) return NotFound();
            return brand;
        }

        // POST: api/Brands
        [HttpPost]
        public async Task<ActionResult<Brand>> PostBrand(Brand brand)
        {
            _context.Brands.Add(brand);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetBrand), new { id = brand.Brandid }, brand);
        }

        // PUT: api/Brands/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutBrand(int id, Brand brand)
        {
            if (id != brand.Brandid) return BadRequest();
            _context.Entry(brand).State = EntityState.Modified;
            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Brands.Any(e => e.Brandid == id)) return NotFound();
                throw;
            }
            return NoContent();
        }

        // DELETE: api/Brands/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteBrand(int id)
        {
            var brand = await _context.Brands.FindAsync(id);
            if (brand == null) return NotFound();
            _context.Brands.Remove(brand);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
