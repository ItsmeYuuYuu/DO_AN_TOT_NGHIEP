using ECommerceBackend.DTOs.Common;
using ECommerceBackend.DTOs.News;
using ECommerceBackend.Models;
using ECommerceBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ECommerceBackend.Controllers;

[Route("api/[controller]")]
[ApiController]
public class NewsController : ControllerBase
{
    private readonly ECommerceContext _context;
    private readonly ProductImageStorageService _imageStorage;
    public NewsController(ECommerceContext context, ProductImageStorageService imageStorage) { _context = context; _imageStorage = imageStorage; }

    private static NewsDto Map(Content item) => new(item.Contentid, item.Title, item.Slug, item.Summary, item.Htmlcontent, item.Thumbnailurl, item.Createdbyuserid, item.Createdat, item.Isactive, item.Createdbyuser?.Fullname);
    private IQueryable<Content> NewsQuery() => _context.Contents.Include(item => item.Createdbyuser).Where(item => item.Contenttype == "News");

    [HttpGet] public async Task<ActionResult<IEnumerable<NewsDto>>> GetNews() => Ok((await NewsQuery().OrderByDescending(item => item.Createdat).ToListAsync()).Select(Map));
    [HttpGet("active")] public async Task<ActionResult<IEnumerable<NewsDto>>> GetActiveNews() => Ok((await NewsQuery().Where(item => item.Isactive == true).OrderByDescending(item => item.Createdat).ToListAsync()).Select(Map));
    [HttpGet("{id:int}")] public async Task<ActionResult<NewsDto>> GetNewsItem(int id) { var item = await NewsQuery().FirstOrDefaultAsync(value => value.Contentid == id); return item == null ? NotFound(new ApiErrorDto("Tin tức không tồn tại.", null)) : Ok(Map(item)); }
    [HttpGet("by-slug/{slug}")] public async Task<ActionResult<NewsDto>> GetNewsItemBySlug(string slug) { var item = await NewsQuery().FirstOrDefaultAsync(value => value.Slug == slug.Trim().ToLowerInvariant() && value.Isactive == true); return item == null ? NotFound(new ApiErrorDto("Tin tức không tồn tại.", null)) : Ok(Map(item)); }

    [HttpPost, ECommerceBackend.Authorization.HasPermission(ECommerceBackend.Authorization.AppPermissions.ContentManage)]
    public async Task<ActionResult<NewsDto>> PostNews(CreateNewsRequestDto dto)
    {
        if (!int.TryParse(User.FindFirst("userid")?.Value, out var userId)) return BadRequest(new ApiErrorDto("Không xác định được người tạo.", null));
        var item = new Content { Contenttype = "News", Title = dto.Title.Trim(), Summary = dto.Summary, Htmlcontent = dto.Content, Thumbnailurl = dto.Thumbnail, Slug = await ProductSlugService.GenerateUniqueNewsSlugAsync(_context, dto.Title), Createdbyuserid = userId, Createdat = DateTime.UtcNow, Isactive = dto.Isactive ?? true };
        _context.Contents.Add(item); await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetNewsItem), new { id = item.Contentid }, Map(item));
    }

    [HttpPut("{id:int}"), ECommerceBackend.Authorization.HasPermission(ECommerceBackend.Authorization.AppPermissions.ContentManage)]
    public async Task<ActionResult<NewsDto>> PutNews(int id, UpdateNewsRequestDto dto)
    {
        var item = await _context.Contents.FirstOrDefaultAsync(value => value.Contentid == id && value.Contenttype == "News");
        if (item == null) return NotFound(new ApiErrorDto("Tin tức không tồn tại.", null));
        var oldThumbnail = item.Thumbnailurl; item.Title = dto.Title.Trim(); item.Summary = dto.Summary; item.Htmlcontent = dto.Content; item.Thumbnailurl = dto.Thumbnail; item.Isactive = dto.Isactive ?? item.Isactive;
        if (string.IsNullOrWhiteSpace(item.Slug)) item.Slug = await ProductSlugService.GenerateUniqueNewsSlugAsync(_context, item.Title, id);
        await _context.SaveChangesAsync(); if (oldThumbnail != item.Thumbnailurl) _imageStorage.DeleteByUrl(oldThumbnail); return Ok(Map(item));
    }

    [HttpDelete("{id:int}"), ECommerceBackend.Authorization.HasPermission(ECommerceBackend.Authorization.AppPermissions.ContentManage)]
    public async Task<IActionResult> DeleteNews(int id) { var item = await _context.Contents.FirstOrDefaultAsync(value => value.Contentid == id && value.Contenttype == "News"); if (item == null) return NotFound(new ApiErrorDto("Tin tức không tồn tại.", null)); _context.Contents.Remove(item); await _context.SaveChangesAsync(); _imageStorage.DeleteByUrl(item.Thumbnailurl); return NoContent(); }
}
