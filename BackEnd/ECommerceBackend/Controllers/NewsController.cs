using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.News;
using ECommerceBackend.DTOs.Common;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NewsController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public NewsController(ECommerceContext context) => _context = context;

        private static NewsDto MapToDto(News n) => new NewsDto(
            n.Postid,
            n.Title,
            n.Summary,
            n.Content,
            n.Thumbnail,
            n.Userid,
            n.Createdat,
            n.Isactive,
            n.User?.Fullname
        );

        [HttpGet]
        public async Task<ActionResult<IEnumerable<NewsDto>>> GetNews()
        {
            var newsList = await _context.News.Include(n => n.User).OrderByDescending(n => n.Createdat).ToListAsync();
            return Ok(newsList.Select(MapToDto));
        }

        [HttpGet("active")]
        public async Task<ActionResult<IEnumerable<NewsDto>>> GetActiveNews()
        {
            var newsList = await _context.News.Include(n => n.User).Where(n => n.Isactive == true).OrderByDescending(n => n.Createdat).ToListAsync();
            return Ok(newsList.Select(MapToDto));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<NewsDto>> GetNewsItem(int id)
        {
            var news = await _context.News.Include(n => n.User).FirstOrDefaultAsync(n => n.Postid == id);
            if (news == null) return NotFound(new ApiErrorDto("Tin tức không tồn tại.", null));
            return Ok(MapToDto(news));
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<NewsDto>> PostNews([FromBody] CreateNewsRequestDto dto)
        {
            var claimUserId = User.FindFirst("userid")?.Value;
            if (string.IsNullOrEmpty(claimUserId))
                return BadRequest(new ApiErrorDto("Không xác định được danh tính người tạo.", null));

            var news = new News
            {
                Title = dto.Title,
                Summary = dto.Summary,
                Content = dto.Content,
                Thumbnail = dto.Thumbnail,
                Userid = int.Parse(claimUserId),
                Createdat = DateTime.UtcNow,
                Isactive = dto.Isactive ?? true
            };

            _context.News.Add(news);
            await _context.SaveChangesAsync();

            var createdNews = await _context.News.Include(n => n.User).FirstOrDefaultAsync(n => n.Postid == news.Postid);
            return CreatedAtAction(nameof(GetNewsItem), new { id = news.Postid }, MapToDto(createdNews!));
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> PutNews(int id, [FromBody] UpdateNewsRequestDto dto)
        {
            var news = await _context.News.FindAsync(id);
            if (news == null) return NotFound(new ApiErrorDto("Tin tức không tồn tại.", null));

            news.Title = dto.Title;
            news.Summary = dto.Summary;
            news.Content = dto.Content;
            news.Thumbnail = dto.Thumbnail;
            if (dto.Isactive.HasValue)
            {
                news.Isactive = dto.Isactive.Value;
            }

            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.News.Any(e => e.Postid == id)) return NotFound(new ApiErrorDto("Tin tức không tồn tại.", null));
                throw;
            }

            var updatedNews = await _context.News.Include(n => n.User).FirstOrDefaultAsync(n => n.Postid == news.Postid);
            return Ok(MapToDto(updatedNews!));
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteNews(int id)
        {
            var news = await _context.News.FindAsync(id);
            if (news == null) return NotFound(new ApiErrorDto("Tin tức không tồn tại.", null));
            _context.News.Remove(news);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
