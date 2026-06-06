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

        private static string GenerateTemporaryInventoryCode(int variantId)
        {
            // Product creation only knows a quantity, not each device's real IMEI.
            // Use a compact, explicit placeholder for quantity-only stock records.
            return $"TMP-{variantId}-{Guid.NewGuid():N}";
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
                Createdat = DateTime.Now
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
            if (dto.Categoryid.HasValue && !await _context.Categories.AnyAsync(c => c.Categoryid == dto.Categoryid.Value))
                return BadRequest(new ApiErrorDto("Danh mục đã chọn không tồn tại.", null));

            if (dto.Brandid.HasValue && !await _context.Brands.AnyAsync(b => b.Brandid == dto.Brandid.Value))
                return BadRequest(new ApiErrorDto("Thương hiệu đã chọn không tồn tại.", null));

            var requestedSkus = dto.Variants?
                .Select(v => v.Sku.Trim())
                .ToList() ?? new List<string>();

            if (requestedSkus.Count != requestedSkus.Distinct(StringComparer.OrdinalIgnoreCase).Count())
                return BadRequest(new ApiErrorDto("Các biến thể không được trùng mã SKU.", null));

            if (requestedSkus.Count > 0)
            {
                var existingSku = await _context.Productvariants
                    .Where(v => v.Sku != null && requestedSkus.Contains(v.Sku))
                    .Select(v => v.Sku)
                    .FirstOrDefaultAsync();

                if (existingSku != null)
                    return Conflict(new ApiErrorDto($"Mã SKU '{existingSku}' đã tồn tại.", null));
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var product = new Product
                {
                    Productname = dto.Productname,
                    Description = dto.Description,
                    Categoryid = dto.Categoryid,
                    Brandid = dto.Brandid,
                    Createdat = DateTime.Now
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

                        // Auto-generate inventory items (stock) if Quantity is provided
                        if (vDto.Quantity.HasValue && vDto.Quantity.Value > 0)
                        {
                            for (int idx = 1; idx <= vDto.Quantity.Value; idx++)
                            {
                                var item = new Inventoryitem
                                {
                                    Imei = GenerateTemporaryInventoryCode(variant.Variantid),
                                    Variantid = variant.Variantid,
                                    Status = "InStock",
                                    Importedat = DateTime.Now
                                };
                                _context.Inventoryitems.Add(item);
                            }
                            await _context.SaveChangesAsync();
                        }
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

            if (dto.Categoryid.HasValue && !await _context.Categories.AnyAsync(c => c.Categoryid == dto.Categoryid.Value))
                return BadRequest(new ApiErrorDto("Danh mục đã chọn không tồn tại.", null));

            if (dto.Brandid.HasValue && !await _context.Brands.AnyAsync(b => b.Brandid == dto.Brandid.Value))
                return BadRequest(new ApiErrorDto("Thương hiệu đã chọn không tồn tại.", null));

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
        public async Task<IActionResult> DeleteProduct(int id, [FromServices] ILogger<ProductsController> logger)
        {
            var product = await _context.Products
                .Include(p => p.Productvariants)
                .FirstOrDefaultAsync(p => p.Productid == id);

            if (product == null) return NotFound();

            var variantIds = product.Productvariants.Select(v => v.Variantid).ToList();
            var inventoryItems = await _context.Inventoryitems
                .Where(i => i.Variantid.HasValue && variantIds.Contains(i.Variantid.Value))
                .ToListAsync();
            var inventoryCodes = inventoryItems.Select(i => i.Imei).ToList();

            var hasOrderHistory = inventoryCodes.Count > 0 &&
                await _context.Orderitems.AnyAsync(oi => oi.Imei != null && inventoryCodes.Contains(oi.Imei));

            if (hasOrderHistory)
            {
                return Conflict(new ApiErrorDto(
                    "Không thể xóa sản phẩm đã phát sinh đơn hàng. Hãy ngừng kinh doanh sản phẩm thay vì xóa lịch sử.",
                    null));
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                if (variantIds.Count > 0)
                {
                    var cartItems = await _context.Cartitems
                        .Where(ci => variantIds.Contains(ci.Variantid))
                        .ToListAsync();
                    var reviews = await _context.Reviews
                        .Where(r => r.Variantid.HasValue && variantIds.Contains(r.Variantid.Value))
                        .ToListAsync();
                    var images = await _context.Productimages
                        .Where(pi => pi.Variantid.HasValue && variantIds.Contains(pi.Variantid.Value))
                        .ToListAsync();

                    _context.Cartitems.RemoveRange(cartItems);
                    _context.Reviews.RemoveRange(reviews);
                    _context.Productimages.RemoveRange(images);
                    _context.Inventoryitems.RemoveRange(inventoryItems);
                    await _context.SaveChangesAsync();

                    _context.Productvariants.RemoveRange(product.Productvariants);
                    await _context.SaveChangesAsync();
                }

                _context.Products.Remove(product);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return NoContent();
            }
            catch (DbUpdateException ex)
            {
                await transaction.RollbackAsync();
                logger.LogError(ex, "Không thể xóa sản phẩm {ProductId}.", id);
                return Conflict(new ApiErrorDto(
                    "Không thể xóa sản phẩm vì vẫn còn dữ liệu nghiệp vụ liên quan.",
                    null));
            }
        }
    }
}
