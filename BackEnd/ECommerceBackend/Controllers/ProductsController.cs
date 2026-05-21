using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Products;
using ECommerceBackend.DTOs.Common;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProductsController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public ProductsController(ECommerceContext context)
        {
            _context = context;
        }

        private static ProductListItemDto MapToDto(Product p)
        {
            var variants = p.Productvariants.Select(v => new ProductVariantDto(
                v.Variantid,
                v.Productid,
                v.Sku,
                v.Baseprice,
                v.Saleprice,
                v.Condition != null ? new ConditionDto(v.Condition.Conditionid, v.Condition.Conditionname) : null,
                v.Productimages.Select(i => new ProductImageDto(i.Imageid, i.Imageurl, i.Ismain)).ToList()
            )).ToList();

            return new ProductListItemDto(
                p.Productid,
                p.Productname,
                p.Description,
                p.Createdat,
                p.Brand != null ? new LookupDto(p.Brand.Brandid, p.Brand.Brandname) : null,
                p.Category != null ? new LookupDto(p.Category.Categoryid, p.Category.Categoryname) : null,
                variants
            );
        }

        private static ProductDetailDto MapToDetailDto(Product p)
        {
            var variants = p.Productvariants.Select(v => new ProductVariantDto(
                v.Variantid,
                v.Productid,
                v.Sku,
                v.Baseprice,
                v.Saleprice,
                v.Condition != null ? new ConditionDto(v.Condition.Conditionid, v.Condition.Conditionname) : null,
                v.Productimages.Select(i => new ProductImageDto(i.Imageid, i.Imageurl, i.Ismain)).ToList()
            )).ToList();

            return new ProductDetailDto(
                p.Productid,
                p.Productname,
                p.Description,
                p.Createdat,
                p.Brand != null ? new LookupDto(p.Brand.Brandid, p.Brand.Brandname) : null,
                p.Category != null ? new LookupDto(p.Category.Categoryid, p.Category.Categoryname) : null,
                variants
            );
        }

        // GET: api/Products
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProductListItemDto>>> GetProducts()
        {
            var products = await _context.Products
                .Include(p => p.Brand)
                .Include(p => p.Category)
                .Include(p => p.Productvariants)
                    .ThenInclude(v => v.Condition)
                .Include(p => p.Productvariants)
                    .ThenInclude(v => v.Productimages)
                .ToListAsync();

            return Ok(products.Select(MapToDto));
        }

        // GET: api/Products/search?q=&categoryId=&brandId=&minPrice=&maxPrice=
        [HttpGet("search")]
        public async Task<ActionResult<IEnumerable<ProductListItemDto>>> SearchProducts(
            [FromQuery] string? q,
            [FromQuery] int? categoryId,
            [FromQuery] int? brandId,
            [FromQuery] decimal? minPrice,
            [FromQuery] decimal? maxPrice)
        {
            var query = _context.Products
                .Include(p => p.Brand)
                .Include(p => p.Category)
                .Include(p => p.Productvariants)
                    .ThenInclude(v => v.Condition)
                .Include(p => p.Productvariants)
                    .ThenInclude(v => v.Productimages)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(q))
                query = query.Where(p => p.Productname.Contains(q) || (p.Description != null && p.Description.Contains(q)));

            if (categoryId.HasValue)
                query = query.Where(p => p.Categoryid == categoryId);

            if (brandId.HasValue)
                query = query.Where(p => p.Brandid == brandId);

            if (minPrice.HasValue)
                query = query.Where(p => p.Productvariants.Any(v => (v.Saleprice ?? v.Baseprice) >= minPrice));

            if (maxPrice.HasValue)
                query = query.Where(p => p.Productvariants.Any(v => (v.Saleprice ?? v.Baseprice) <= maxPrice));

            var products = await query.ToListAsync();
            return Ok(products.Select(MapToDto));
        }

        // GET: api/Products/5
        [HttpGet("{id}")]
        public async Task<ActionResult<ProductDetailDto>> GetProduct(int id)
        {
            var product = await _context.Products
                .Include(p => p.Brand)
                .Include(p => p.Category)
                .Include(p => p.Productvariants)
                    .ThenInclude(v => v.Condition)
                .Include(p => p.Productvariants)
                    .ThenInclude(v => v.Productimages)
                .FirstOrDefaultAsync(p => p.Productid == id);

            if (product == null) return NotFound();
            return Ok(MapToDetailDto(product));
        }

        // POST: api/Products
        [HttpPost]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
        public async Task<ActionResult<ProductDetailDto>> PostProduct([FromBody] CreateProductRequestDto dto)
        {
            var product = new Product
            {
                Productname = dto.Productname,
                Description = dto.Description,
                Categoryid = dto.Categoryid,
                Brandid = dto.Brandid,
                Createdat = DateTime.UtcNow
            };

            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            // Load navigation properties
            var createdProduct = await _context.Products
                .Include(p => p.Brand)
                .Include(p => p.Category)
                .Include(p => p.Productvariants)
                    .ThenInclude(v => v.Condition)
                .Include(p => p.Productvariants)
                    .ThenInclude(v => v.Productimages)
                .FirstAsync(p => p.Productid == product.Productid);

            return CreatedAtAction(nameof(GetProduct), new { id = product.Productid }, MapToDetailDto(createdProduct));
        }

        // PUT: api/Products/5
        [HttpPut("{id}")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
        public async Task<IActionResult> PutProduct(int id, [FromBody] UpdateProductRequestDto dto)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null) return NotFound();

            product.Productname = dto.Productname;
            product.Description = dto.Description;
            product.Categoryid = dto.Categoryid;
            product.Brandid = dto.Brandid;

            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Products.Any(e => e.Productid == id)) return NotFound();
                throw;
            }

            // Load navigation properties
            var updatedProduct = await _context.Products
                .Include(p => p.Brand)
                .Include(p => p.Category)
                .Include(p => p.Productvariants)
                    .ThenInclude(v => v.Condition)
                .Include(p => p.Productvariants)
                    .ThenInclude(v => v.Productimages)
                .FirstAsync(p => p.Productid == product.Productid);

            return Ok(MapToDetailDto(updatedProduct));
        }

        // DELETE: api/Products/5
        [HttpDelete("{id}")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null) return NotFound();

            _context.Products.Remove(product);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}