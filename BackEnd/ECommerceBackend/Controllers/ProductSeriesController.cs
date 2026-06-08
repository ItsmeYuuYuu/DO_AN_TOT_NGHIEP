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

    private static ProductSeriesDto MapToDto(Productseries series) => new(
        series.Seriesid,
        series.Brandid,
        series.Brand.Brandname,
        series.Seriesname,
        series.Displayorder ?? 0,
        series.Isactive ?? true,
        series.Products.Count
    );

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductSeriesDto>>> GetProductSeries(
        [FromQuery] int? brandId,
        [FromQuery] bool activeOnly = false)
    {
        var query = _context.Productseries
            .Include(series => series.Brand)
            .Include(series => series.Products)
            .AsQueryable();

        if (brandId.HasValue)
            query = query.Where(series => series.Brandid == brandId.Value);

        if (activeOnly)
            query = query.Where(series => series.Isactive == true);

        var seriesList = await query
            .OrderBy(series => series.Displayorder)
            .ThenBy(series => series.Seriesname)
            .ToListAsync();

        return Ok(seriesList.Select(MapToDto));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProductSeriesDto>> GetProductSeriesById(int id)
    {
        var series = await _context.Productseries
            .Include(item => item.Brand)
            .Include(item => item.Products)
            .FirstOrDefaultAsync(item => item.Seriesid == id);

        if (series == null)
            return NotFound(new ApiErrorDto("Dòng máy không tồn tại.", null));

        return Ok(MapToDto(series));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Manager,Warehouse,Content")]
    public async Task<ActionResult<ProductSeriesDto>> PostProductSeries(CreateProductSeriesRequestDto dto)
    {
        if (!await _context.Brands.AnyAsync(brand => brand.Brandid == dto.Brandid))
            return BadRequest(new ApiErrorDto("Thương hiệu đã chọn không tồn tại.", null));

        var cleanName = dto.Seriesname.Trim();
        var duplicated = await _context.Productseries.AnyAsync(series =>
            series.Brandid == dto.Brandid &&
            series.Seriesname.ToLower() == cleanName.ToLower());
        if (duplicated)
            return Conflict(new ApiErrorDto("Dòng máy này đã tồn tại trong thương hiệu đã chọn.", null));

        var series = new Productseries
        {
            Brandid = dto.Brandid,
            Seriesname = cleanName,
            Displayorder = dto.Displayorder ?? 0,
            Isactive = dto.Isactive ?? true,
            Createdat = DateTime.Now
        };

        _context.Productseries.Add(series);
        await _context.SaveChangesAsync();

        var created = await _context.Productseries
            .Include(item => item.Brand)
            .Include(item => item.Products)
            .FirstAsync(item => item.Seriesid == series.Seriesid);

        return CreatedAtAction(nameof(GetProductSeriesById), new { id = created.Seriesid }, MapToDto(created));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Manager,Warehouse,Content")]
    public async Task<IActionResult> PutProductSeries(int id, UpdateProductSeriesRequestDto dto)
    {
        var series = await _context.Productseries.FindAsync(id);
        if (series == null)
            return NotFound(new ApiErrorDto("Dòng máy không tồn tại.", null));

        if (!await _context.Brands.AnyAsync(brand => brand.Brandid == dto.Brandid))
            return BadRequest(new ApiErrorDto("Thương hiệu đã chọn không tồn tại.", null));

        var cleanName = dto.Seriesname.Trim();
        var duplicated = await _context.Productseries.AnyAsync(item =>
            item.Seriesid != id &&
            item.Brandid == dto.Brandid &&
            item.Seriesname.ToLower() == cleanName.ToLower());
        if (duplicated)
            return Conflict(new ApiErrorDto("Dòng máy này đã tồn tại trong thương hiệu đã chọn.", null));

        series.Brandid = dto.Brandid;
        series.Seriesname = cleanName;
        series.Displayorder = dto.Displayorder ?? 0;
        series.Isactive = dto.Isactive ?? true;

        await _context.SaveChangesAsync();

        var updated = await _context.Productseries
            .Include(item => item.Brand)
            .Include(item => item.Products)
            .FirstAsync(item => item.Seriesid == id);

        return Ok(MapToDto(updated));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteProductSeries(int id)
    {
        var series = await _context.Productseries
            .Include(item => item.Products)
            .FirstOrDefaultAsync(item => item.Seriesid == id);
        if (series == null)
            return NotFound(new ApiErrorDto("Dòng máy không tồn tại.", null));

        foreach (var product in series.Products)
            product.Seriesid = null;

        _context.Productseries.Remove(series);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
