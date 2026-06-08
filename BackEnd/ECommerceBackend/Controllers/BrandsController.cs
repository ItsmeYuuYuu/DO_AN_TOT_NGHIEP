using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Brands;

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
        public async Task<ActionResult<IEnumerable<BrandDto>>> GetBrands()
        {
            var brands = await _context.Brands
                .Select(b => new BrandDto(b.Brandid, b.Brandname, b.Products.Count))
                .ToListAsync();
            return Ok(brands);
        }

        // GET: api/Brands/5
        [HttpGet("{id}")]
        public async Task<ActionResult<BrandDto>> GetBrand(int id)
        {
            var brand = await _context.Brands
                .Where(b => b.Brandid == id)
                .Select(b => new BrandDto(b.Brandid, b.Brandname, b.Products.Count))
                .FirstOrDefaultAsync();
            if (brand == null) return NotFound();
            return Ok(brand);
        }

        // POST: api/Brands
        [HttpPost]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,Manager,Warehouse,Content")]
        public async Task<ActionResult<BrandDto>> PostBrand([FromBody] CreateBrandRequestDto dto)
        {
            var brand = new Brand
            {
                Brandname = dto.Brandname
            };
            _context.Brands.Add(brand);
            await _context.SaveChangesAsync();

            var responseDto = new BrandDto(brand.Brandid, brand.Brandname, 0);
            return CreatedAtAction(nameof(GetBrand), new { id = brand.Brandid }, responseDto);
        }

        // PUT: api/Brands/5
        [HttpPut("{id}")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,Manager,Warehouse,Content")]
        public async Task<IActionResult> PutBrand(int id, [FromBody] UpdateBrandRequestDto dto)
        {
            var brand = await _context.Brands.FindAsync(id);
            if (brand == null) return NotFound();

            brand.Brandname = dto.Brandname;

            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Brands.Any(e => e.Brandid == id)) return NotFound();
                throw;
            }

            var productCount = await _context.Products.CountAsync(p => p.Brandid == id);
            var responseDto = new BrandDto(brand.Brandid, brand.Brandname, productCount);
            return Ok(responseDto);
        }

        // DELETE: api/Brands/5
        [HttpDelete("{id}")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
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
