using ECommerceBackend.DTOs.Common;
using ECommerceBackend.DTOs.HomepageProductSections;
using ECommerceBackend.DTOs.Products;
using ECommerceBackend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ECommerceBackend.Controllers;

[Route("api/[controller]")]
[ApiController]
public class HomepageProductSectionsController : ControllerBase
{
    private readonly ECommerceContext _context;

    public HomepageProductSectionsController(ECommerceContext context)
    {
        _context = context;
    }

    private static List<VariantAttributeValueDto> EmptyAttributes() => new();

    private static ProductListItemDto MapProduct(Product product)
    {
        var variants = product.Productvariants.Select(variant => new ProductVariantDto(
            variant.Variantid,
            variant.Productid,
            variant.Sku ?? "",
            variant.Baseprice,
            variant.Saleprice,
            !string.IsNullOrEmpty(variant.Condition)
                ? new ConditionDto(Math.Abs(variant.Condition.GetHashCode()), variant.Condition)
                : null,
            variant.Productimages.Select(image =>
                new ProductImageDto(image.Imageid, image.Imageurl, image.Ismain)).ToList(),
            EmptyAttributes(),
            variant.Inventoryitems.Count(item => item.Status == "InStock")
        )).ToList();

        return new ProductListItemDto(
            product.Productid,
            product.Slug,
            product.Productname,
            product.Description,
            product.Createdat,
            product.Brand != null ? new LookupDto(product.Brand.Brandid, product.Brand.Brandname) : null,
            product.Category != null ? new LookupDto(product.Category.Categoryid, product.Category.Categoryname) : null,
            product.Series != null ? new LookupDto(product.Series.Seriesid, product.Series.Seriesname) : null,
            variants
        );
    }

    private static HomepageProductSectionDto MapSection(Homepageproductsection section, bool activeItemsOnly)
    {
        var items = section.Items
            .Where(item => !activeItemsOnly || item.Isactive == true)
            .OrderBy(item => item.Displayorder ?? 0)
            .ThenBy(item => item.Itemid)
            .Take(activeItemsOnly ? 5 : int.MaxValue)
            .Select(item => new HomepageProductSectionItemDto(
                item.Itemid,
                item.Sectionid,
                item.Productid,
                item.Displayorder,
                item.Isactive,
                item.Createdat,
                item.Product != null ? MapProduct(item.Product) : null
            ))
            .ToList();

        return new HomepageProductSectionDto(
            section.Sectionid,
            section.Sectionkey,
            section.Title,
            section.Subtitle,
            section.Theme,
            section.Displayorder,
            section.Isactive,
            section.Createdat,
            items
        );
    }

    private IQueryable<Homepageproductsection> SectionQuery() =>
        _context.Homepageproductsections
            .Include(section => section.Items)
                .ThenInclude(item => item.Product)
                    .ThenInclude(product => product.Brand)
            .Include(section => section.Items)
                .ThenInclude(item => item.Product)
                    .ThenInclude(product => product.Category)
            .Include(section => section.Items)
                .ThenInclude(item => item.Product)
                    .ThenInclude(product => product.Series)
            .Include(section => section.Items)
                .ThenInclude(item => item.Product)
                    .ThenInclude(product => product.Productvariants)
                        .ThenInclude(variant => variant.Productimages)
            .Include(section => section.Items)
                .ThenInclude(item => item.Product)
                    .ThenInclude(product => product.Productvariants)
                        .ThenInclude(variant => variant.Inventoryitems);

    [HttpGet("active")]
    public async Task<ActionResult<IEnumerable<HomepageProductSectionDto>>> GetActiveSections()
    {
        var sections = await SectionQuery()
            .Where(section => section.Isactive == true)
            .OrderBy(section => section.Displayorder ?? 0)
            .ThenBy(section => section.Sectionid)
            .ToListAsync();

        return Ok(sections.Select(section => MapSection(section, activeItemsOnly: true)));
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Manager,Content")]
    public async Task<ActionResult<IEnumerable<HomepageProductSectionDto>>> GetSections()
    {
        var sections = await SectionQuery()
            .OrderBy(section => section.Displayorder ?? 0)
            .ThenBy(section => section.Sectionid)
            .ToListAsync();

        return Ok(sections.Select(section => MapSection(section, activeItemsOnly: false)));
    }

    [HttpPut("{sectionId:int}")]
    [Authorize(Roles = "Admin,Manager,Content")]
    public async Task<IActionResult> UpdateSection(
        int sectionId,
        [FromBody] UpdateHomepageProductSectionRequestDto dto)
    {
        var section = await _context.Homepageproductsections
            .Include(item => item.Items)
            .FirstOrDefaultAsync(item => item.Sectionid == sectionId);
        if (section == null)
        {
            return NotFound(new ApiErrorDto("Không tìm thấy vùng hiển thị trang chủ.", null));
        }

        var requestedItems = (dto.Items ?? new List<UpdateHomepageProductSectionItemDto>())
            .GroupBy(item => item.Productid)
            .Select(group => group.First())
            .Take(5)
            .ToList();
        var requestedProductIds = requestedItems.Select(item => item.Productid).ToList();
        var existingProductIds = await _context.Products
            .Where(product => requestedProductIds.Contains(product.Productid))
            .Select(product => product.Productid)
            .ToListAsync();

        var missingProductId = requestedProductIds.FirstOrDefault(id => !existingProductIds.Contains(id));
        if (missingProductId != 0)
        {
            return BadRequest(new ApiErrorDto($"Sản phẩm #{missingProductId} không tồn tại.", null));
        }

        section.Title = dto.Title.Trim();
        section.Subtitle = dto.Subtitle?.Trim();
        section.Theme = string.IsNullOrWhiteSpace(dto.Theme) ? "LightBlue" : dto.Theme.Trim();
        section.Displayorder = dto.Displayorder ?? 0;
        section.Isactive = dto.Isactive ?? true;

        var requestedIdSet = requestedProductIds.ToHashSet();
        var removedItems = section.Items
            .Where(item => !requestedIdSet.Contains(item.Productid))
            .ToList();
        _context.Homepageproductsectionitems.RemoveRange(removedItems);

        for (var index = 0; index < requestedItems.Count; index++)
        {
            var itemDto = requestedItems[index];
            var item = section.Items.FirstOrDefault(existing => existing.Productid == itemDto.Productid);
            if (item == null)
            {
                item = new Homepageproductsectionitem
                {
                    Sectionid = section.Sectionid,
                    Productid = itemDto.Productid,
                    Createdat = DateTime.Now
                };
                _context.Homepageproductsectionitems.Add(item);
            }

            item.Displayorder = itemDto.Displayorder ?? index;
            item.Isactive = itemDto.Isactive ?? true;
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }
}
