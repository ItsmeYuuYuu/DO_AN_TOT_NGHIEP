using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NewsController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public NewsController(ECommerceContext context) => _context = context;

        [HttpGet]
        public async Task<ActionResult<IEnumerable<News>>> GetNews()
            => await _context.News.Include(n => n.User).OrderByDescending(n => n.Createdat).ToListAsync();

        [HttpGet("active")]
        public async Task<ActionResult<IEnumerable<News>>> GetActiveNews()
            => await _context.News.Where(n => n.Isactive == true).OrderByDescending(n => n.Createdat).ToListAsync();

        [HttpGet("{id}")]
        public async Task<ActionResult<News>> GetNewsItem(int id)
        {
            var news = await _context.News.Include(n => n.User).FirstOrDefaultAsync(n => n.Postid == id);
            if (news == null) return NotFound();
            return news;
        }

        [HttpPost]
        public async Task<ActionResult<News>> PostNews(News news)
        {
            _context.News.Add(news);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetNewsItem), new { id = news.Postid }, news);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutNews(int id, News news)
        {
            if (id != news.Postid) return BadRequest();
            _context.Entry(news).State = EntityState.Modified;
            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.News.Any(e => e.Postid == id)) return NotFound();
                throw;
            }
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNews(int id)
        {
            var news = await _context.News.FindAsync(id);
            if (news == null) return NotFound();
            _context.News.Remove(news);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
