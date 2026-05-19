using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Products;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProductVariantsController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public ProductVariantsController(ECommerceContext context) => _context = context;

        private static ProductVariantDto MapToDto(Productvariant v)
        {
            return new ProductVariantDto(
                v.Variantid,
                v.Productid,
                v.Sku ?? "",
                v.Baseprice,
                v.Saleprice,
                v.Condition != null ? new ConditionDto(v.Condition.Conditionid, v.Condition.Conditionname) : null,
                v.Productimages.Select(i => new ProductImageDto(i.Imageid, i.Imageurl, i.Ismain)).ToList()
            );
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProductVariantDto>>> GetProductVariants()
        {
            var variants = await _context.Productvariants
                .Include(v => v.Condition)
                .Include(v => v.Productimages)
                .ToListAsync();
            return Ok(variants.Select(MapToDto));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ProductVariantDto>> GetProductVariant(int id)
        {
            var variant = await _context.Productvariants
                .Include(v => v.Condition)
                .Include(v => v.Productimages)
                .FirstOrDefaultAsync(v => v.Variantid == id);
            
            if (variant == null) return NotFound();
            return Ok(MapToDto(variant));
        }

        [HttpGet("product/{productId}")]
        public async Task<ActionResult<IEnumerable<ProductVariantDto>>> GetVariantsByProduct(int productId)
        {
            var variants = await _context.Productvariants
                .Include(v => v.Condition)
                .Include(v => v.Productimages)
                .Where(v => v.Productid == productId)
                .ToListAsync();
            
            return Ok(variants.Select(MapToDto));
        }

        [HttpPost]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
        public async Task<ActionResult<ProductVariantDto>> PostProductVariant([FromBody] CreateProductVariantRequestDto dto)
        {
            var variant = new Productvariant
            {
                Productid = dto.Productid,
                Conditionid = dto.Conditionid,
                Sku = dto.Sku,
                Baseprice = dto.Baseprice,
                Saleprice = dto.Saleprice
            };

            _context.Productvariants.Add(variant);
            await _context.SaveChangesAsync();

            var created = await _context.Productvariants
                .Include(v => v.Condition)
                .Include(v => v.Productimages)
                .FirstAsync(v => v.Variantid == variant.Variantid);

            return CreatedAtAction(nameof(GetProductVariant), new { id = variant.Variantid }, MapToDto(created));
        }

        [HttpPut("{id}")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
        public async Task<IActionResult> PutProductVariant(int id, [FromBody] UpdateProductVariantRequestDto dto)
        {
            var variant = await _context.Productvariants.FindAsync(id);
            if (variant == null) return NotFound();

            variant.Conditionid = dto.Conditionid;
            variant.Sku = dto.Sku;
            variant.Baseprice = dto.Baseprice;
            variant.Saleprice = dto.Saleprice;

            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Productvariants.Any(e => e.Variantid == id)) return NotFound();
                throw;
            }

            var updated = await _context.Productvariants
                .Include(v => v.Condition)
                .Include(v => v.Productimages)
                .FirstAsync(v => v.Variantid == variant.Variantid);

            return Ok(MapToDto(updated));
        }

        [HttpDelete("{id}")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
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
