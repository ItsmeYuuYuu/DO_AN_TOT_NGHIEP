using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BannersController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public BannersController(ECommerceContext context) => _context = context;

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Banner>>> GetBanners()
            => await _context.Banners.ToListAsync();

        [HttpGet("active")]
        public async Task<ActionResult<IEnumerable<Banner>>> GetActiveBanners()
            => await _context.Banners.Where(b => b.Isactive == true).ToListAsync();

        [HttpGet("{id}")]
        public async Task<ActionResult<Banner>> GetBanner(int id)
        {
            var banner = await _context.Banners.FindAsync(id);
            if (banner == null) return NotFound();
            return banner;
        }

        [HttpPost]
        public async Task<ActionResult<Banner>> PostBanner(Banner banner)
        {
            _context.Banners.Add(banner);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetBanner), new { id = banner.Bannerid }, banner);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutBanner(int id, Banner banner)
        {
            if (id != banner.Bannerid) return BadRequest();
            _context.Entry(banner).State = EntityState.Modified;
            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Banners.Any(e => e.Bannerid == id)) return NotFound();
                throw;
            }
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteBanner(int id)
        {
            var banner = await _context.Banners.FindAsync(id);
            if (banner == null) return NotFound();
            _context.Banners.Remove(banner);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
