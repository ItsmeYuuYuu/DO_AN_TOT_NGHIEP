using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Products;
using ECommerceBackend.DTOs.ProductVariants;
using ECommerceBackend.DTOs.Common;
using System.Text.Json;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProductVariantsController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public ProductVariantsController(ECommerceContext context) => _context = context;

        private static List<VariantAttributeValueDto> ParseSpecifications(string? specsJson)
        {
            var list = new List<VariantAttributeValueDto>();
            if (string.IsNullOrEmpty(specsJson))
            {
                return list;
            }
            try
            {
                var dict = JsonSerializer.Deserialize<Dictionary<string, string>>(specsJson);
                if (dict != null)
                {
                    int index = 1;
                    foreach (var kvp in dict)
                    {
                        list.Add(new VariantAttributeValueDto(index++, kvp.Value ?? "", kvp.Key ?? ""));
                    }
                }
            }
            catch (Exception)
            {
                // Null safety / fallback if JSON is invalid or null
            }
            return list;
        }

        private static ProductVariantDto MapToDto(Productvariant v)
        {
            var images = new List<ProductImageDto>();
            if (!string.IsNullOrWhiteSpace(v.Imageurls))
            {
                try
                {
                    var urls = JsonSerializer.Deserialize<List<string>>(v.Imageurls);
                    if (urls != null)
                    {
                        for (int i = 0; i < urls.Count; i++)
                        {
                            images.Add(new ProductImageDto(i + 1, urls[i], i == 0));
                        }
                    }
                }
                catch { }
            }

            return new ProductVariantDto(
                v.Variantid,
                v.Productid,
                v.Sku ?? "",
                v.Baseprice,
                v.Saleprice,
                !string.IsNullOrEmpty(v.Condition) ? new ConditionDto(Math.Abs(v.Condition.GetHashCode()), v.Condition) : null,
                images,
                ParseSpecifications(v.Specifications)
            );
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProductVariantDto>>> GetProductVariants()
        {
            var variants = await _context.Productvariants
                .ToListAsync();
            return Ok(variants.Select(MapToDto));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ProductVariantDto>> GetProductVariant(int id)
        {
            var variant = await _context.Productvariants
                .FirstOrDefaultAsync(v => v.Variantid == id);
            
            if (variant == null) return NotFound();
            return Ok(MapToDto(variant));
        }

        [HttpGet("product/{productId}")]
        public async Task<ActionResult<IEnumerable<ProductVariantDto>>> GetVariantsByProduct(int productId)
        {
            var variants = await _context.Productvariants
                .Where(v => v.Productid == productId)
                .ToListAsync();
            
            return Ok(variants.Select(MapToDto));
        }

        [HttpPost]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,Manager,Warehouse")]
        public async Task<ActionResult<ProductVariantDto>> PostProductVariant([FromBody] CreateProductVariantRequestDto dto)
        {
            var variant = new Productvariant
            {
                Productid = dto.Productid,
                Condition = dto.Condition ?? "Mới 100%",
                Sku = dto.Sku,
                Baseprice = dto.Baseprice,
                Saleprice = dto.Saleprice,
                Specifications = dto.Specifications
            };

            _context.Productvariants.Add(variant);
            await _context.SaveChangesAsync();

            var created = await _context.Productvariants
                .FirstAsync(v => v.Variantid == variant.Variantid);

            return CreatedAtAction(nameof(GetProductVariant), new { id = variant.Variantid }, MapToDto(created));
        }

        [HttpPut("{id}")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,Manager,Warehouse")]
        public async Task<IActionResult> PutProductVariant(int id, [FromBody] UpdateProductVariantRequestDto dto)
        {
            var variant = await _context.Productvariants.FindAsync(id);
            if (variant == null) return NotFound();

            variant.Condition = dto.Condition ?? "Mới 100%";
            variant.Sku = dto.Sku;
            variant.Baseprice = dto.Baseprice;
            variant.Saleprice = dto.Saleprice;
            variant.Specifications = dto.Specifications;

            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Productvariants.Any(e => e.Variantid == id)) return NotFound();
                throw;
            }

            var updated = await _context.Productvariants
                .FirstAsync(v => v.Variantid == variant.Variantid);

            return Ok(MapToDto(updated));
        }

        [HttpDelete("{id}")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,Manager,Warehouse")]
        public async Task<IActionResult> DeleteProductVariant(int id)
        {
            var variant = await _context.Productvariants.FindAsync(id);
            if (variant == null) return NotFound();
            _context.Productvariants.Remove(variant);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpGet("{id}/attributes")]
        public async Task<ActionResult<IEnumerable<VariantAttributeValueDto>>> GetVariantAttributes(int id)
        {
            var variant = await _context.Productvariants
                .FirstOrDefaultAsync(v => v.Variantid == id);

            if (variant == null) return NotFound();

            var dtos = ParseSpecifications(variant.Specifications);
            return Ok(dtos);
        }

        [HttpPut("{id}/attributes")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,Manager,Warehouse,Content")]
        public async Task<IActionResult> AssignVariantAttributes(int id, [FromBody] List<VariantSpecDto> specs)
        {
            var variant = await _context.Productvariants.FindAsync(id);
            if (variant == null) return NotFound();

            if (specs == null || !specs.Any())
            {
                variant.Specifications = null;
            }
            else
            {
                var dict = new Dictionary<string, string>();
                foreach (var s in specs)
                {
                    if (!string.IsNullOrWhiteSpace(s.Key))
                    {
                        dict[s.Key] = s.Value ?? "";
                    }
                }
                variant.Specifications = JsonSerializer.Serialize(dict);
            }

            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
