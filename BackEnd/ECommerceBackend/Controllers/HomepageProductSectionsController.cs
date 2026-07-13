using System.Text.Json;
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
    private const string HomepageSectionType = "HomepageProductSection";
    private sealed record HomepageSectionData(
        string Sectionkey,
        string? Subtitle,
        string Theme,
        List<int> Productids);

    private readonly ECommerceContext _context;

    public HomepageProductSectionsController(ECommerceContext context)
    {
        _context = context;
    }

    private static List<VariantAttributeValueDto> EmptyAttributes() => new();

    private static ProductListItemDto MapProduct(Product product)
    {
        var variants = product.Productvariants.Select(variant => {
            var images = new List<ProductImageDto>();
            if (!string.IsNullOrWhiteSpace(variant.Imageurls))
            {
                try
                {
                    var urls = JsonSerializer.Deserialize<List<string>>(variant.Imageurls);
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
                variant.Variantid,
                variant.Productid,
                variant.Sku ?? "",
                variant.Baseprice,
                variant.Saleprice,
                !string.IsNullOrEmpty(variant.Condition)
                    ? new ConditionDto(Math.Abs(variant.Condition.GetHashCode()), variant.Condition)
                    : null,
                images,
                EmptyAttributes(),
                variant.Inventoryitems.Count(item => item.Status == "InStock")
            );
        }).ToList();

        return new ProductListItemDto(
            product.Productid,
            product.Slug,
            product.Productname,
            product.Description,
            product.Createdat,
            product.Brand != null ? new LookupDto(product.Brand.Brandid, product.Brand.Brandname) : null,
            product.Category != null ? new LookupDto(product.Category.Categoryid, product.Category.Categoryname) : null,
            null,
            variants
        );
    }

    private static HomepageSectionData ParseSectionData(Content section)
    {
        if (!string.IsNullOrWhiteSpace(section.Contentdata))
        {
            try
            {
                var data = JsonSerializer.Deserialize<HomepageSectionData>(section.Contentdata,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (data != null) return data;
            }
            catch (JsonException) { }
        }

        return new HomepageSectionData($"section-{section.Contentid}", section.Summary, "LightBlue", []);
    }

    private async Task<HomepageProductSectionDto> MapSectionAsync(Content section, bool activeItemsOnly)
    {
        var data = ParseSectionData(section);
        var items = new List<HomepageProductSectionItemDto>();
        var productIds = data.Productids;
        if (productIds.Count > 0)
        {
                var products = await _context.Products
                    .Include(product => product.Brand)
                    .Include(product => product.Category)
                    .Include(product => product.Productvariants)
                        .ThenInclude(variant => variant.Inventoryitems)
                    .Where(p => productIds.Contains(p.Productid))
                    .ToDictionaryAsync(p => p.Productid);

                int order = 0;
                foreach (var pid in productIds)
                {
                    if (products.TryGetValue(pid, out var p))
                    {
                        items.Add(new HomepageProductSectionItemDto(
                            order + 1,
                            section.Contentid,
                            pid,
                            order,
                            true,
                            section.Createdat,
                            MapProduct(p)
                        ));
                        order++;
                        if (activeItemsOnly && order >= 5) break;
                    }
                }
        }

        return new HomepageProductSectionDto(
            section.Contentid,
            data.Sectionkey,
            section.Title,
            data.Subtitle,
            data.Theme,
            section.Displayorder,
            section.Isactive,
            section.Createdat,
            items
        );
    }

    [HttpGet("active")]
    public async Task<ActionResult<IEnumerable<HomepageProductSectionDto>>> GetActiveSections()
    {
        var sections = await _context.Contents
            .AsNoTracking()
            .Where(section => section.Contenttype == HomepageSectionType && section.Isactive == true)
            .OrderBy(section => section.Displayorder ?? 0)
            .ThenBy(section => section.Contentid)
            .ToListAsync();

        var dtos = new List<HomepageProductSectionDto>();
        foreach(var s in sections)
        {
            dtos.Add(await MapSectionAsync(s, true));
        }

        return Ok(dtos);
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Manager,Content")]
    public async Task<ActionResult<IEnumerable<HomepageProductSectionDto>>> GetSections()
    {
        var sections = await _context.Contents
            .AsNoTracking()
            .Where(section => section.Contenttype == HomepageSectionType)
            .OrderBy(section => section.Displayorder ?? 0)
            .ThenBy(section => section.Contentid)
            .ToListAsync();

        var dtos = new List<HomepageProductSectionDto>();
        foreach(var s in sections)
        {
            dtos.Add(await MapSectionAsync(s, false));
        }

        return Ok(dtos);
    }

    [HttpPut("{sectionId:int}")]
    [Authorize(Roles = "Admin,Manager,Content")]
    public async Task<IActionResult> UpdateSection(
        int sectionId,
        [FromBody] UpdateHomepageProductSectionRequestDto dto)
    {
        var section = await _context.Contents
            .FirstOrDefaultAsync(item =>
                item.Contentid == sectionId && item.Contenttype == HomepageSectionType);
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
        var currentData = ParseSectionData(section);
        var theme = string.IsNullOrWhiteSpace(dto.Theme) ? "LightBlue" : dto.Theme.Trim();
        section.Displayorder = dto.Displayorder ?? 0;
        section.Isactive = dto.Isactive ?? true;
        section.Summary = dto.Subtitle?.Trim();
        section.Contentdata = JsonSerializer.Serialize(new HomepageSectionData(
            currentData.Sectionkey,
            dto.Subtitle?.Trim(),
            theme,
            requestedProductIds));

        await _context.SaveChangesAsync();
        return NoContent();
    }
}
