using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Products;
using ECommerceBackend.DTOs.Common;
using System.Text.Json;

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

        private static ProductListItemDto MapToDto(Product p)
        {
            var variants = p.Productvariants.Select(v => new ProductVariantDto(
                v.Variantid,
                v.Productid,
                v.Sku ?? "",
                v.Baseprice,
                v.Saleprice,
                !string.IsNullOrEmpty(v.Condition) ? new ConditionDto(Math.Abs(v.Condition.GetHashCode()), v.Condition) : null,
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
                v.Sku ?? "",
                v.Baseprice,
                v.Saleprice,
                !string.IsNullOrEmpty(v.Condition) ? new ConditionDto(Math.Abs(v.Condition.GetHashCode()), v.Condition) : null,
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
                    .ThenInclude(v => v.Productimages)
                .FirstOrDefaultAsync(p => p.Productid == id);

            if (product == null) return NotFound(new ApiErrorDto("Không tìm thấy sản phẩm", null));
            return Ok(MapToDetailDto(product));
        }

        // GET: api/Products/5/full-detail
        [HttpGet("{id}/full-detail")]
        public async Task<ActionResult<FullProductDetailDto>> GetFullProductDetail(int id)
        {
            var product = await _context.Products
                .Include(p => p.Brand)
                .Include(p => p.Category)
                .Include(p => p.Productvariants)
                    .ThenInclude(v => v.Productimages)
                .Include(p => p.Productvariants)
                    .ThenInclude(v => v.Reviews)
                .FirstOrDefaultAsync(p => p.Productid == id);

            if (product == null) return NotFound(new ApiErrorDto("Không tìm thấy sản phẩm", null));

            var allReviews = product.Productvariants.SelectMany(v => v.Reviews).ToList();
            var totalReviews = allReviews.Count;
            var avgRating = totalReviews > 0 ? allReviews.Average(r => (double)r.Rating) : 0;
            var star5 = allReviews.Count(r => r.Rating == 5);
            var star4 = allReviews.Count(r => r.Rating == 4);
            var star3 = allReviews.Count(r => r.Rating == 3);
            var star2 = allReviews.Count(r => r.Rating == 2);
            var star1 = allReviews.Count(r => r.Rating == 1);

            var reviewSummary = new ReviewSummaryDto(avgRating, totalReviews, star5, star4, star3, star2, star1);

            List<ProductListItemDto> relatedProducts = new List<ProductListItemDto>();
            if (product.Brandid.HasValue)
            {
                var related = await _context.Products
                    .Include(p => p.Brand)
                    .Include(p => p.Category)
                    .Include(p => p.Productvariants)
                        .ThenInclude(v => v.Productimages)
                    .Where(p => p.Brandid == product.Brandid && p.Productid != id)
                    .Take(5)
                    .ToListAsync();
                relatedProducts = related.Select(MapToDto).ToList();
            }

            var variants = product.Productvariants.Select(v => new ProductVariantDto(
                v.Variantid,
                v.Productid,
                v.Sku ?? "",
                v.Baseprice,
                v.Saleprice,
                !string.IsNullOrEmpty(v.Condition) ? new ConditionDto(Math.Abs(v.Condition.GetHashCode()), v.Condition) : null,
                v.Productimages.Select(i => new ProductImageDto(i.Imageid, i.Imageurl, i.Ismain)).ToList(),
                ParseSpecifications(v.Specifications)
            )).ToList();

            var result = new FullProductDetailDto(
                product.Productid,
                product.Productname,
                product.Description,
                product.Createdat,
                product.Brand != null ? new LookupDto(product.Brand.Brandid, product.Brand.Brandname) : null,
                product.Category != null ? new LookupDto(product.Category.Categoryid, product.Category.Categoryname) : null,
                variants,
                reviewSummary,
                relatedProducts
            );

            return Ok(result);
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
                    .ThenInclude(v => v.Productimages)
                .FirstAsync(p => p.Productid == product.Productid);

            return CreatedAtAction(nameof(GetProduct), new { id = product.Productid }, MapToDetailDto(createdProduct));
        }

        // POST: api/Products/full
        [HttpPost("full")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
        public async Task<ActionResult<ProductDetailDto>> PostFullProduct([FromBody] CreateFullProductDto dto, [FromServices] ILogger<ProductsController> logger)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
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

                if (dto.Variants != null && dto.Variants.Any())
                {
                    foreach (var vDto in dto.Variants)
                    {
                        var variant = new Productvariant
                        {
                            Productid = product.Productid,
                            Sku = vDto.Sku,
                            Baseprice = vDto.Baseprice,
                            Saleprice = vDto.Saleprice,
                            Condition = vDto.Condition ?? "Mới 100%"
                        };

                        if (vDto.Specs != null && vDto.Specs.Any())
                        {
                            var dict = new Dictionary<string, string>();
                            foreach (var spec in vDto.Specs)
                            {
                                if (!string.IsNullOrWhiteSpace(spec.Key))
                                {
                                    dict[spec.Key] = spec.Value ?? "";
                                }
                            }
                            variant.Specifications = JsonSerializer.Serialize(dict);
                        }

                        _context.Productvariants.Add(variant);
                        await _context.SaveChangesAsync();
                    }
                }

                await transaction.CommitAsync();

                var createdProduct = await _context.Products
                    .Include(p => p.Brand)
                    .Include(p => p.Category)
                    .Include(p => p.Productvariants)
                        .ThenInclude(v => v.Productimages)
                    .FirstAsync(p => p.Productid == product.Productid);

                return CreatedAtAction(nameof(GetProduct), new { id = product.Productid }, MapToDetailDto(createdProduct));
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Lỗi hệ thống khi tạo sản phẩm.");
                await transaction.RollbackAsync();
                return StatusCode(500, new ApiErrorDto("Lỗi hệ thống khi tạo sản phẩm.", null));
            }
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