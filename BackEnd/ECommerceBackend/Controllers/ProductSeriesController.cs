using ECommerceBackend.DTOs.Common;
using ECommerceBackend.DTOs.ProductSeries;
using ECommerceBackend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ECommerceBackend.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ProductSeriesController : ControllerBase
{
    private readonly ECommerceContext _context;

    public ProductSeriesController(ECommerceContext context) => _context = context;

    // Compatibility read API. Series is now a label on Products, not its own table.
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductSeriesDto>>> GetProductSeries(
        [FromQuery] int? brandId,
        [FromQuery] bool? activeOnly)
    {
        var query = _context.Products
            .AsNoTracking()
            .Where(product => product.Seriesname != null && product.Seriesname != "")
            .Include(product => product.Brand)
            .AsQueryable();

        if (brandId.HasValue)
            query = query.Where(product => product.Brandid == brandId.Value);

        var rows = await query
            .GroupBy(product => new
            {
                product.Brandid,
                BrandName = product.Brand != null ? product.Brand.Brandname : "",
                product.Seriesname
            })
            .Select(group => new
            {
                SeriesId = group.Min(product => product.Productid),
                group.Key.Brandid,
                group.Key.BrandName,
                SeriesName = group.Key.Seriesname!,
                ProductCount = group.Count()
            })
            .OrderBy(item => item.Brandid)
            .ThenBy(item => item.SeriesName)
            .ToListAsync();

        return Ok(rows.Select(item => new ProductSeriesDto(
            item.SeriesId,
            item.Brandid ?? 0,
            item.BrandName,
            item.SeriesName,
            0,
            true,
            item.ProductCount)));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProductSeriesDto>> GetProductSeriesById(int id)
    {
        var product = await _context.Products.AsNoTracking()
            .Include(item => item.Brand)
            .FirstOrDefaultAsync(item => item.Productid == id && item.Seriesname != null);
        if (product == null)
            return NotFound(new ApiErrorDto("DÃ²ng mÃ¡y khÃ´ng tá»“n táº¡i.", null));

        var productCount = await _context.Products.CountAsync(item =>
            item.Brandid == product.Brandid && item.Seriesname == product.Seriesname);

        return Ok(new ProductSeriesDto(product.Productid, product.Brandid ?? 0,
            product.Brand?.Brandname ?? "", product.Seriesname!, 0, true, productCount));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Manager")]
    public ActionResult CreateProductSeries([FromBody] CreateProductSeriesRequestDto dto) =>
        Conflict(new ApiErrorDto("DÃ²ng mÃ¡y Ä‘Æ°á»£c nháº­p trá»±c tiáº¿p khi táº¡o/sá»­a sáº£n pháº©m.", null));

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Manager")]
    public ActionResult UpdateProductSeries(int id, [FromBody] UpdateProductSeriesRequestDto dto) =>
        Conflict(new ApiErrorDto("DÃ²ng mÃ¡y Ä‘Æ°á»£c nháº­p trá»±c tiáº¿p khi táº¡o/sá»­a sáº£n pháº©m.", null));

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public ActionResult DeleteProductSeries(int id) =>
        Conflict(new ApiErrorDto("DÃ²ng mÃ¡y Ä‘Æ°á»£c nháº­p trá»±c tiáº¿p khi táº¡o/sá»­a sáº£n pháº©m.", null));
}
