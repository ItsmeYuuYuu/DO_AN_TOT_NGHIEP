using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Products;
using ECommerceBackend.DTOs.Common;
using ECommerceBackend.Services;
using System.Text.Json;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProductsController : ControllerBase
    {
        private readonly ECommerceContext _context;
        private readonly ProductImageStorageService _imageStorage;

        public ProductsController(ECommerceContext context, ProductImageStorageService imageStorage)
        {
            _context = context;
            _imageStorage = imageStorage;
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
                v.Productimages.Select(i => new ProductImageDto(i.Imageid, i.Imageurl, i.Ismain)).ToList(),
                null,
                v.Inventoryitems.Count(item => item.Status == "InStock")
            )).ToList();

            return new ProductListItemDto(
                p.Productid,
                p.Slug,
                p.Productname,
                p.Description,
                p.Createdat,
                p.Brand != null ? new LookupDto(p.Brand.Brandid, p.Brand.Brandname) : null,
                p.Category != null ? new LookupDto(p.Category.Categoryid, p.Category.Categoryname) : null,
                p.Series != null ? new LookupDto(p.Series.Seriesid, p.Series.Seriesname) : null,
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
                v.Productimages.Select(i => new ProductImageDto(i.Imageid, i.Imageurl, i.Ismain)).ToList(),
                null,
                v.Inventoryitems.Count(item => item.Status == "InStock")
            )).ToList();

            return new ProductDetailDto(
                p.Productid,
                p.Slug,
                p.Productname,
                p.Description,
                p.Createdat,
                p.Brand != null ? new LookupDto(p.Brand.Brandid, p.Brand.Brandname) : null,
                p.Category != null ? new LookupDto(p.Category.Categoryid, p.Category.Categoryname) : null,
                p.Series != null ? new LookupDto(p.Series.Seriesid, p.Series.Seriesname) : null,
                variants
            );
        }

        private static string GenerateTemporaryInventoryCode(int variantId)
        {
            // Product creation only knows a quantity, not each device's real IMEI.
            // Use a compact, explicit placeholder for quantity-only stock records.
            return $"TMP-{variantId}-{Guid.NewGuid():N}";
        }

        private IQueryable<Product> ProductDetailQuery() =>
            _context.Products
                .Include(p => p.Brand)
                .Include(p => p.Category)
                .Include(p => p.Series)
                .Include(p => p.Productvariants)
                    .ThenInclude(v => v.Productimages)
                .Include(p => p.Productvariants)
                    .ThenInclude(v => v.Inventoryitems);

        private IQueryable<Product> FullProductDetailQuery() =>
            _context.Products
                .Include(p => p.Brand)
                .Include(p => p.Category)
                .Include(p => p.Series)
                .Include(p => p.Productvariants)
                    .ThenInclude(v => v.Productimages)
                .Include(p => p.Productvariants)
                    .ThenInclude(v => v.Reviews)
                .Include(p => p.Productvariants)
                    .ThenInclude(v => v.Inventoryitems);

        // GET: api/Products
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProductListItemDto>>> GetProducts()
        {
            var products = await _context.Products
                .Include(p => p.Brand)
                .Include(p => p.Category)
                .Include(p => p.Series)
                .Include(p => p.Productvariants)
                    .ThenInclude(v => v.Productimages)
                .Include(p => p.Productvariants)
                    .ThenInclude(v => v.Inventoryitems)
                .ToListAsync();

            return Ok(products.Select(MapToDto));
        }

        // GET: api/Products/search?q=&categoryId=&brandId=&minPrice=&maxPrice=
        [HttpGet("search")]
        public async Task<ActionResult<IEnumerable<ProductListItemDto>>> SearchProducts(
            [FromQuery] string? q,
            [FromQuery] int? categoryId,
            [FromQuery] int? brandId,
            [FromQuery] int? seriesId,
            [FromQuery] decimal? minPrice,
            [FromQuery] decimal? maxPrice)
        {
            var query = _context.Products
                .Include(p => p.Brand)
                .Include(p => p.Category)
                .Include(p => p.Series)
                .Include(p => p.Productvariants)
                    .ThenInclude(v => v.Productimages)
                .Include(p => p.Productvariants)
                    .ThenInclude(v => v.Inventoryitems)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(q))
            {
                var searchTerm = q.Trim().ToLower();
                query = query.Where(p =>
                    p.Productname.ToLower().Contains(searchTerm) ||
                    (p.Description != null && p.Description.ToLower().Contains(searchTerm)) ||
                    (p.Brand != null && p.Brand.Brandname.ToLower().Contains(searchTerm)) ||
                    (p.Series != null && p.Series.Seriesname.ToLower().Contains(searchTerm)));
            }

            if (categoryId.HasValue)
                query = query.Where(p => p.Categoryid == categoryId);

            if (brandId.HasValue)
                query = query.Where(p => p.Brandid == brandId);

            if (seriesId.HasValue)
                query = query.Where(p => p.Seriesid == seriesId);

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
            var product = await ProductDetailQuery()
                .FirstOrDefaultAsync(p => p.Productid == id);

            if (product == null) return NotFound(new ApiErrorDto("Không tìm thấy sản phẩm", null));
            return Ok(MapToDetailDto(product));
        }

        // GET: api/Products/by-slug/google-pixel-8-pro
        [HttpGet("by-slug/{slug}")]
        public async Task<ActionResult<ProductDetailDto>> GetProductBySlug(string slug)
        {
            var normalizedSlug = slug.Trim().ToLowerInvariant();
            var product = await ProductDetailQuery()
                .FirstOrDefaultAsync(p => p.Slug == normalizedSlug);

            if (product == null) return NotFound(new ApiErrorDto("Không tìm thấy sản phẩm", null));
            return Ok(MapToDetailDto(product));
        }

        // GET: api/Products/5/full-detail
        [HttpGet("{id}/full-detail")]
        public async Task<ActionResult<FullProductDetailDto>> GetFullProductDetail(int id)
        {
            var product = await FullProductDetailQuery()
                .FirstOrDefaultAsync(p => p.Productid == id);

            if (product == null) return NotFound(new ApiErrorDto("Không tìm thấy sản phẩm", null));
            return Ok(await BuildFullProductDetailDto(product));
        }

        // GET: api/Products/by-slug/google-pixel-8-pro/full-detail
        [HttpGet("by-slug/{slug}/full-detail")]
        public async Task<ActionResult<FullProductDetailDto>> GetFullProductDetailBySlug(string slug)
        {
            var normalizedSlug = slug.Trim().ToLowerInvariant();
            var product = await FullProductDetailQuery()
                .FirstOrDefaultAsync(p => p.Slug == normalizedSlug);

            if (product == null) return NotFound(new ApiErrorDto("Không tìm thấy sản phẩm", null));
            return Ok(await BuildFullProductDetailDto(product));
        }

        private async Task<FullProductDetailDto> BuildFullProductDetailDto(Product product)
        {
            var allReviews = product.Productvariants.SelectMany(v => v.Reviews).ToList();
            var totalReviews = allReviews.Count;
            var avgRating = totalReviews > 0 ? allReviews.Average(r => (double)(r.Rating ?? 0)) : 0;
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
                    .Include(p => p.Series)
                    .Include(p => p.Productvariants)
                        .ThenInclude(v => v.Productimages)
                    .Include(p => p.Productvariants)
                        .ThenInclude(v => v.Inventoryitems)
                    .Where(p => p.Brandid == product.Brandid && p.Productid != product.Productid)
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
                ParseSpecifications(v.Specifications),
                v.Inventoryitems.Count(item => item.Status == "InStock")
            )).ToList();

            var result = new FullProductDetailDto(
                product.Productid,
                product.Slug,
                product.Productname,
                product.Description,
                product.Createdat,
                product.Brand != null ? new LookupDto(product.Brand.Brandid, product.Brand.Brandname) : null,
                product.Category != null ? new LookupDto(product.Category.Categoryid, product.Category.Categoryname) : null,
                product.Series != null ? new LookupDto(product.Series.Seriesid, product.Series.Seriesname) : null,
                variants,
                reviewSummary,
                relatedProducts
            );

            return result;
        }

        // POST: api/Products
        [HttpPost]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,Manager,Warehouse")]
        public async Task<ActionResult<ProductDetailDto>> PostProduct([FromBody] CreateProductRequestDto dto)
        {
            if (dto.Seriesid.HasValue &&
                !await _context.Productseries.AnyAsync(series =>
                    series.Seriesid == dto.Seriesid.Value &&
                    (!dto.Brandid.HasValue || series.Brandid == dto.Brandid.Value)))
            {
                return BadRequest(new ApiErrorDto("Dòng máy đã chọn không tồn tại hoặc không thuộc thương hiệu đã chọn.", null));
            }

            var product = new Product
            {
                Productname = dto.Productname,
                Slug = await ProductSlugService.GenerateUniqueSlugAsync(_context, dto.Productname),
                Description = dto.Description,
                Categoryid = dto.Categoryid,
                Brandid = dto.Brandid,
                Seriesid = dto.Seriesid,
                Createdat = DateTime.Now
            };

            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            // Load navigation properties
            var createdProduct = await _context.Products
                .Include(p => p.Brand)
                .Include(p => p.Category)
                .Include(p => p.Series)
                .Include(p => p.Productvariants)
                    .ThenInclude(v => v.Productimages)
                .FirstAsync(p => p.Productid == product.Productid);

            return CreatedAtAction(nameof(GetProduct), new { id = product.Productid }, MapToDetailDto(createdProduct));
        }

        // POST: api/Products/full
        [HttpPost("full")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,Manager,Warehouse")]
        public async Task<ActionResult<ProductDetailDto>> PostFullProduct([FromBody] CreateFullProductDto dto, [FromServices] ILogger<ProductsController> logger)
        {
            if (dto.Categoryid.HasValue && !await _context.Categories.AnyAsync(c => c.Categoryid == dto.Categoryid.Value))
                return BadRequest(new ApiErrorDto("Danh mục đã chọn không tồn tại.", null));

            if (dto.Brandid.HasValue && !await _context.Brands.AnyAsync(b => b.Brandid == dto.Brandid.Value))
                return BadRequest(new ApiErrorDto("Thương hiệu đã chọn không tồn tại.", null));

            if (dto.Seriesid.HasValue &&
                !await _context.Productseries.AnyAsync(series =>
                    series.Seriesid == dto.Seriesid.Value &&
                    (!dto.Brandid.HasValue || series.Brandid == dto.Brandid.Value)))
            {
                return BadRequest(new ApiErrorDto("Dòng máy đã chọn không tồn tại hoặc không thuộc thương hiệu đã chọn.", null));
            }

            if (dto.Variants == null || dto.Variants.Count == 0)
                return BadRequest(new ApiErrorDto("Sản phẩm phải có ít nhất một biến thể.", null));

            var allocatedQuantity = dto.Variants.Sum(variant => variant.Quantity ?? 0);
            if (allocatedQuantity != dto.Totalquantity)
            {
                return BadRequest(new ApiErrorDto(
                    $"Tổng số lượng các biến thể ({allocatedQuantity}) phải bằng số lượng lô hàng ({dto.Totalquantity}).",
                    null));
            }

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

            if (dto.Variants?.Any(v => v.Images == null || v.Images.Count == 0) == true)
                return BadRequest(new ApiErrorDto("Mỗi biến thể phải có ít nhất một hình ảnh.", null));

            if (dto.Variants?.Any(v => v.Images!.Count > 8) == true)
                return BadRequest(new ApiErrorDto("Mỗi biến thể chỉ được có tối đa 8 hình ảnh.", null));

            var invalidImage = dto.Variants?
                .SelectMany(v => v.Images ?? new List<CreateProductImageDto>())
                .FirstOrDefault(image =>
                    !Uri.TryCreate(image.Imageurl, UriKind.Absolute, out var uri) ||
                    (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps));

            if (invalidImage != null)
                return BadRequest(new ApiErrorDto($"URL hình ảnh không hợp lệ: '{invalidImage.Imageurl}'.", null));

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var product = new Product
                {
                    Productname = dto.Productname,
                    Slug = await ProductSlugService.GenerateUniqueSlugAsync(_context, dto.Productname),
                    Description = dto.Description,
                    Categoryid = dto.Categoryid,
                    Brandid = dto.Brandid,
                    Seriesid = dto.Seriesid,
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

                        var images = vDto.Images ?? new List<CreateProductImageDto>();
                        var mainImageIndex = images.FindIndex(image => image.Ismain);
                        if (mainImageIndex < 0)
                        {
                            mainImageIndex = 0;
                        }

                        for (int imageIndex = 0; imageIndex < images.Count; imageIndex++)
                        {
                            _context.Productimages.Add(new Productimage
                            {
                                Variantid = variant.Variantid,
                                Imageurl = images[imageIndex].Imageurl.Trim(),
                                Ismain = imageIndex == mainImageIndex
                            });
                        }
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
                    .Include(p => p.Series)
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

        // PUT: api/Products/5/full
        [HttpPut("{id}/full")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,Manager,Warehouse,Content")]
        public async Task<IActionResult> PutFullProduct(
            int id,
            [FromBody] UpdateFullProductDto dto,
            [FromServices] ILogger<ProductsController> logger)
        {
            if (dto.Categoryid.HasValue && !await _context.Categories.AnyAsync(c => c.Categoryid == dto.Categoryid.Value))
                return BadRequest(new ApiErrorDto("Danh mục đã chọn không tồn tại.", null));

            if (dto.Brandid.HasValue && !await _context.Brands.AnyAsync(b => b.Brandid == dto.Brandid.Value))
                return BadRequest(new ApiErrorDto("Thương hiệu đã chọn không tồn tại.", null));

            if (dto.Seriesid.HasValue &&
                !await _context.Productseries.AnyAsync(series =>
                    series.Seriesid == dto.Seriesid.Value &&
                    (!dto.Brandid.HasValue || series.Brandid == dto.Brandid.Value)))
            {
                return BadRequest(new ApiErrorDto("Dòng máy đã chọn không tồn tại hoặc không thuộc thương hiệu đã chọn.", null));
            }

            var requestedSkus = dto.Variants.Select(variant => variant.Sku.Trim()).ToList();
            if (requestedSkus.Any(string.IsNullOrWhiteSpace))
                return BadRequest(new ApiErrorDto("SKU của biến thể không được để trống.", null));

            if (requestedSkus.Count != requestedSkus.Distinct(StringComparer.OrdinalIgnoreCase).Count())
                return BadRequest(new ApiErrorDto("Các biến thể không được trùng mã SKU.", null));

            if (dto.Variants.Any(variant => variant.Baseprice <= 0))
                return BadRequest(new ApiErrorDto("Giá gốc của biến thể phải lớn hơn 0.", null));

            if (dto.Variants.Any(variant => variant.Saleprice.HasValue && variant.Saleprice > variant.Baseprice))
                return BadRequest(new ApiErrorDto("Giá giảm không được lớn hơn giá gốc.", null));

            if (dto.Variants.Any(variant => variant.Images == null || variant.Images.Count == 0))
                return BadRequest(new ApiErrorDto("Mỗi biến thể phải có ít nhất một hình ảnh.", null));

            if (dto.Variants.Any(variant => variant.Images!.Count > 8))
                return BadRequest(new ApiErrorDto("Mỗi biến thể chỉ được có tối đa 8 hình ảnh.", null));

            var invalidImage = dto.Variants
                .SelectMany(variant => variant.Images ?? new List<CreateProductImageDto>())
                .FirstOrDefault(image =>
                    !Uri.TryCreate(image.Imageurl, UriKind.Absolute, out var uri) ||
                    (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps));
            if (invalidImage != null)
                return BadRequest(new ApiErrorDto($"URL hình ảnh không hợp lệ: '{invalidImage.Imageurl}'.", null));

            var product = await _context.Products
                .Include(p => p.Productvariants)
                    .ThenInclude(variant => variant.Productimages)
                .Include(p => p.Productvariants)
                    .ThenInclude(variant => variant.Inventoryitems)
                        .ThenInclude(item => item.Orderitems)
                .FirstOrDefaultAsync(p => p.Productid == id);
            if (product == null)
                return NotFound(new ApiErrorDto("Không tìm thấy sản phẩm.", null));

            var requestedExistingIds = dto.Variants
                .Where(variant => variant.Variantid.HasValue)
                .Select(variant => variant.Variantid!.Value)
                .ToHashSet();
            var currentVariantIds = product.Productvariants.Select(variant => variant.Variantid).ToHashSet();
            if (requestedExistingIds.Any(variantId => !currentVariantIds.Contains(variantId)))
                return BadRequest(new ApiErrorDto("Có biến thể không thuộc sản phẩm đang chỉnh sửa.", null));

            if (User.IsInRole("Content"))
            {
                if (dto.Variants.Any(variant => !variant.Variantid.HasValue) ||
                    requestedExistingIds.Count != currentVariantIds.Count)
                {
                    return StatusCode(403, new ApiErrorDto(
                        "Nhân viên nội dung không được thêm hoặc xóa biến thể sản phẩm.",
                        null));
                }

                foreach (var variantDto in dto.Variants)
                {
                    var current = product.Productvariants.First(variant =>
                        variant.Variantid == variantDto.Variantid);
                    var currentQuantity = current.Inventoryitems.Count(item => item.Status == "InStock");
                    if (!string.Equals(current.Sku, variantDto.Sku.Trim(), StringComparison.Ordinal) ||
                        !string.Equals(current.Condition ?? "", variantDto.Condition?.Trim() ?? "", StringComparison.Ordinal) ||
                        current.Baseprice != variantDto.Baseprice ||
                        current.Saleprice != variantDto.Saleprice ||
                        currentQuantity != variantDto.Quantity)
                    {
                        return StatusCode(403, new ApiErrorDto(
                            "Nhân viên nội dung chỉ được sửa tên, mô tả, hình ảnh và thông số; không được sửa giá, SKU, tình trạng hoặc tồn kho.",
                            null));
                    }
                }
            }

            var loweredSkus = requestedSkus.Select(sku => sku.ToLower()).ToList();
            var duplicateSku = await _context.Productvariants
                .Where(variant =>
                    !requestedExistingIds.Contains(variant.Variantid) &&
                    variant.Sku != null &&
                    loweredSkus.Contains(variant.Sku.ToLower()))
                .Select(variant => variant.Sku)
                .FirstOrDefaultAsync();
            if (duplicateSku != null)
                return Conflict(new ApiErrorDto($"Mã SKU '{duplicateSku}' đã tồn tại.", null));

            var variantsToDelete = product.Productvariants
                .Where(variant => !requestedExistingIds.Contains(variant.Variantid))
                .ToList();
            var protectedVariant = variantsToDelete.FirstOrDefault(variant =>
                variant.Inventoryitems.Any(item =>
                    item.Orderitems.Any() ||
                    !item.Imei.StartsWith("TMP-", StringComparison.OrdinalIgnoreCase)));
            if (protectedVariant != null)
            {
                return Conflict(new ApiErrorDto(
                    $"Không thể xóa biến thể '{protectedVariant.Sku}' vì đã có IMEI thật hoặc lịch sử đơn hàng.",
                    null));
            }

            foreach (var variantDto in dto.Variants.Where(variant => variant.Variantid.HasValue))
            {
                var variant = product.Productvariants.First(item => item.Variantid == variantDto.Variantid);
                var realInStock = variant.Inventoryitems.Count(item =>
                    item.Status == "InStock" &&
                    !item.Imei.StartsWith("TMP-", StringComparison.OrdinalIgnoreCase));
                if (variantDto.Quantity < realInStock)
                {
                    return Conflict(new ApiErrorDto(
                        $"Tồn kho của SKU '{variant.Sku}' không thể thấp hơn {realInStock} IMEI thật đang còn hàng.",
                        null));
                }
            }

            var removedImageUrls = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var nextProductName = dto.Productname.Trim();
                if (string.IsNullOrWhiteSpace(product.Slug))
                {
                    product.Slug = await ProductSlugService.GenerateUniqueSlugAsync(
                        _context,
                        nextProductName,
                        product.Productid);
                }

                product.Productname = nextProductName;
                product.Description = dto.Description?.Trim();
                product.Categoryid = dto.Categoryid;
                product.Brandid = dto.Brandid;
                product.Seriesid = dto.Seriesid;

                foreach (var variant in variantsToDelete)
                {
                    foreach (var image in variant.Productimages)
                    {
                        removedImageUrls.Add(image.Imageurl);
                    }

                    var cartItems = await _context.Cartitems
                        .Where(item => item.Variantid == variant.Variantid)
                        .ToListAsync();
                    var reviews = await _context.Reviews
                        .Where(review => review.Variantid == variant.Variantid)
                        .ToListAsync();
                    _context.Cartitems.RemoveRange(cartItems);
                    _context.Reviews.RemoveRange(reviews);
                    _context.Productimages.RemoveRange(variant.Productimages);
                    _context.Inventoryitems.RemoveRange(variant.Inventoryitems);
                    _context.Productvariants.Remove(variant);
                }

                foreach (var variantDto in dto.Variants)
                {
                    Productvariant variant;
                    if (variantDto.Variantid.HasValue)
                    {
                        variant = product.Productvariants.First(item => item.Variantid == variantDto.Variantid);
                    }
                    else
                    {
                        variant = new Productvariant { Productid = product.Productid };
                        _context.Productvariants.Add(variant);
                    }

                    variant.Sku = variantDto.Sku.Trim();
                    variant.Condition = string.IsNullOrWhiteSpace(variantDto.Condition)
                        ? "Mới 100%"
                        : variantDto.Condition.Trim();
                    variant.Baseprice = variantDto.Baseprice;
                    variant.Saleprice = variantDto.Saleprice;

                    var specifications = new Dictionary<string, string>();
                    foreach (var spec in variantDto.Specs ?? new List<VariantSpecDto>())
                    {
                        if (!string.IsNullOrWhiteSpace(spec.Key))
                        {
                            specifications[spec.Key.Trim()] = spec.Value?.Trim() ?? "";
                        }
                    }
                    variant.Specifications = specifications.Count > 0
                        ? JsonSerializer.Serialize(specifications)
                        : null;

                    if (!variantDto.Variantid.HasValue)
                    {
                        await _context.SaveChangesAsync();
                    }

                    foreach (var oldImage in variant.Productimages)
                    {
                        if (!variantDto.Images!.Any(image =>
                            string.Equals(image.Imageurl.Trim(), oldImage.Imageurl, StringComparison.OrdinalIgnoreCase)))
                        {
                            removedImageUrls.Add(oldImage.Imageurl);
                        }
                    }
                    _context.Productimages.RemoveRange(variant.Productimages);

                    var images = variantDto.Images!;
                    var mainImageIndex = images.FindIndex(image => image.Ismain);
                    if (mainImageIndex < 0)
                    {
                        mainImageIndex = 0;
                    }
                    for (var imageIndex = 0; imageIndex < images.Count; imageIndex++)
                    {
                        _context.Productimages.Add(new Productimage
                        {
                            Variantid = variant.Variantid,
                            Imageurl = images[imageIndex].Imageurl.Trim(),
                            Ismain = imageIndex == mainImageIndex
                        });
                    }

                    var realInStock = variant.Inventoryitems.Count(item =>
                        item.Status == "InStock" &&
                        !item.Imei.StartsWith("TMP-", StringComparison.OrdinalIgnoreCase));
                    var temporaryInStock = variant.Inventoryitems
                        .Where(item =>
                            item.Status == "InStock" &&
                            item.Imei.StartsWith("TMP-", StringComparison.OrdinalIgnoreCase))
                        .ToList();
                    var requiredTemporaryCount = variantDto.Quantity - realInStock;

                    if (temporaryInStock.Count > requiredTemporaryCount)
                    {
                        _context.Inventoryitems.RemoveRange(
                            temporaryInStock.Take(temporaryInStock.Count - requiredTemporaryCount));
                    }
                    else
                    {
                        for (var index = temporaryInStock.Count; index < requiredTemporaryCount; index++)
                        {
                            _context.Inventoryitems.Add(new Inventoryitem
                            {
                                Imei = GenerateTemporaryInventoryCode(variant.Variantid),
                                Variantid = variant.Variantid,
                                Status = "InStock",
                                Importedat = DateTime.Now
                            });
                        }
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (DbUpdateException ex)
            {
                await transaction.RollbackAsync();
                logger.LogError(ex, "Không thể cập nhật đầy đủ sản phẩm {ProductId}.", id);
                return Conflict(new ApiErrorDto("Không thể cập nhật sản phẩm vì dữ liệu đang được sử dụng.", null));
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                logger.LogError(ex, "Lỗi hệ thống khi cập nhật đầy đủ sản phẩm {ProductId}.", id);
                return StatusCode(500, new ApiErrorDto("Lỗi hệ thống khi cập nhật sản phẩm.", null));
            }

            if (removedImageUrls.Count > 0)
            {
                var stillReferenced = await _context.Productimages
                    .Where(image => removedImageUrls.Contains(image.Imageurl))
                    .Select(image => image.Imageurl)
                    .ToListAsync();
                foreach (var imageUrl in removedImageUrls.Except(stillReferenced, StringComparer.OrdinalIgnoreCase))
                {
                    try
                    {
                        _imageStorage.DeleteByUrl(imageUrl);
                    }
                    catch (Exception ex)
                    {
                        logger.LogWarning(ex, "Không thể xóa file ảnh cũ {ImageUrl}.", imageUrl);
                    }
                }
            }

            return NoContent();
        }

        // PUT: api/Products/5
        [HttpPut("{id}")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,Manager,Warehouse,Content")]
        public async Task<IActionResult> PutProduct(int id, [FromBody] UpdateProductRequestDto dto)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null) return NotFound();

            if (dto.Categoryid.HasValue && !await _context.Categories.AnyAsync(c => c.Categoryid == dto.Categoryid.Value))
                return BadRequest(new ApiErrorDto("Danh mục đã chọn không tồn tại.", null));

            if (dto.Brandid.HasValue && !await _context.Brands.AnyAsync(b => b.Brandid == dto.Brandid.Value))
                return BadRequest(new ApiErrorDto("Thương hiệu đã chọn không tồn tại.", null));

            var nextName = dto.Productname.Trim();
            if (string.IsNullOrWhiteSpace(product.Slug))
            {
                product.Slug = await ProductSlugService.GenerateUniqueSlugAsync(
                    _context,
                    nextName,
                    product.Productid);
            }

            product.Productname = nextName;
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
            var localImageUrls = await _context.Productimages
                .Where(image => image.Variantid.HasValue && variantIds.Contains(image.Variantid.Value))
                .Select(image => image.Imageurl)
                .ToListAsync();

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

                foreach (var imageUrl in localImageUrls)
                {
                    try
                    {
                        _imageStorage.DeleteByUrl(imageUrl);
                    }
                    catch (Exception ex)
                    {
                        logger.LogWarning(ex, "Không thể xóa file ảnh cục bộ {ImageUrl}.", imageUrl);
                    }
                }

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
