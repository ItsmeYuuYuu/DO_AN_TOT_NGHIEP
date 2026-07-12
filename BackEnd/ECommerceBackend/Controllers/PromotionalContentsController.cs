using ECommerceBackend.DTOs.Common;
using ECommerceBackend.DTOs.PromotionalContents;
using ECommerceBackend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ECommerceBackend.Controllers;

[Route("api/[controller]")]
[ApiController]
public class PromotionalContentsController : ControllerBase
{
    private readonly ECommerceContext _context;
    public PromotionalContentsController(ECommerceContext context) => _context = context;

    private static PromotionalContentDto Map(Content content) => new(
        content.Contentid, content.Contenttype, content.Title, content.Thumbnailurl ?? "",
        content.Linkurl, content.Displayorder, content.Isactive, content.Createdat);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PromotionalContentDto>>> GetAll([FromQuery] string? type)
    {
        var query = _context.Contents.Where(item => item.Contenttype != "News");
        if (!string.IsNullOrWhiteSpace(type)) query = query.Where(item => item.Contenttype == type);
        return Ok((await query.OrderBy(item => item.Displayorder ?? 999).ThenBy(item => item.Contentid).ToListAsync()).Select(Map));
    }

    [HttpGet("active")]
    public async Task<ActionResult<IEnumerable<PromotionalContentDto>>> GetActive([FromQuery] string? type)
    {
        var query = _context.Contents.Where(item => item.Contenttype != "News" && item.Isactive == true);
        if (!string.IsNullOrWhiteSpace(type)) query = query.Where(item => item.Contenttype == type);
        return Ok((await query.OrderBy(item => item.Displayorder ?? 999).ThenBy(item => item.Contentid).ToListAsync()).Select(Map));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PromotionalContentDto>> GetById(int id)
    {
        var content = await _context.Contents.FirstOrDefaultAsync(item => item.Contentid == id && item.Contenttype != "News");
        return content == null ? NotFound(new ApiErrorDto("Nội dung không tồn tại.", null)) : Ok(Map(content));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Manager,Content")]
    public async Task<ActionResult<PromotionalContentDto>> Create([FromBody] CreatePromotionalContentRequestDto dto)
    {
        var content = new Content { Contenttype = dto.Contenttype.Trim(), Title = dto.Title?.Trim() ?? "", Thumbnailurl = dto.Imageurl.Trim(), Linkurl = dto.Linkurl?.Trim(), Displayorder = dto.Displayorder ?? 0, Isactive = dto.Isactive ?? true, Createdat = DateTime.UtcNow, Createdbyuserid = CurrentUserId() };
        _context.Contents.Add(content);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = content.Contentid }, Map(content));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Manager,Content")]
    public async Task<ActionResult<PromotionalContentDto>> Update(int id, [FromBody] UpdatePromotionalContentRequestDto dto)
    {
        var content = await _context.Contents.FirstOrDefaultAsync(item => item.Contentid == id && item.Contenttype != "News");
        if (content == null) return NotFound(new ApiErrorDto("Nội dung không tồn tại.", null));
        content.Contenttype = dto.Contenttype.Trim(); content.Title = dto.Title?.Trim() ?? ""; content.Thumbnailurl = dto.Imageurl.Trim(); content.Linkurl = dto.Linkurl?.Trim(); content.Displayorder = dto.Displayorder ?? content.Displayorder; content.Isactive = dto.Isactive ?? content.Isactive;
        await _context.SaveChangesAsync(); return Ok(Map(content));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin,Manager,Content")]
    public async Task<IActionResult> Delete(int id)
    {
        var content = await _context.Contents.FirstOrDefaultAsync(item => item.Contentid == id && item.Contenttype != "News");
        if (content == null) return NotFound(new ApiErrorDto("Nội dung không tồn tại.", null));
        _context.Contents.Remove(content); await _context.SaveChangesAsync(); return NoContent();
    }

    private int? CurrentUserId() => int.TryParse(User.FindFirst("userid")?.Value, out var id) ? id : null;
}
