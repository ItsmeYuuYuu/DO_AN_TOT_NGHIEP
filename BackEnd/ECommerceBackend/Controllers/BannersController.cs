using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Banners;
using ECommerceBackend.DTOs.Common;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BannersController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public BannersController(ECommerceContext context) => _context = context;

        private static BannerDto MapToDto(Banner b) => new BannerDto(
            b.Bannerid,
            b.Imageurl,
            b.Linkurl,
            b.Position,
            b.Isactive
        );

        [HttpGet]
        public async Task<ActionResult<IEnumerable<BannerDto>>> GetBanners()
        {
            var banners = await _context.Banners.ToListAsync();
            return Ok(banners.Select(MapToDto));
        }

        [HttpGet("active")]
        public async Task<ActionResult<IEnumerable<BannerDto>>> GetActiveBanners()
        {
            var banners = await _context.Banners.Where(b => b.Isactive == true).ToListAsync();
            return Ok(banners.Select(MapToDto));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<BannerDto>> GetBanner(int id)
        {
            var banner = await _context.Banners.FindAsync(id);
            if (banner == null) return NotFound(new ApiErrorDto("Banner không tồn tại.", null));
            return Ok(MapToDto(banner));
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<BannerDto>> PostBanner([FromBody] CreateBannerRequestDto dto)
        {
            var banner = new Banner
            {
                Imageurl = dto.Imageurl,
                Linkurl = dto.Linkurl,
                Position = dto.Position,
                Isactive = dto.Isactive ?? true
            };

            _context.Banners.Add(banner);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetBanner), new { id = banner.Bannerid }, MapToDto(banner));
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> PutBanner(int id, [FromBody] UpdateBannerRequestDto dto)
        {
            var banner = await _context.Banners.FindAsync(id);
            if (banner == null) return NotFound(new ApiErrorDto("Banner không tồn tại.", null));

            banner.Imageurl = dto.Imageurl;
            banner.Linkurl = dto.Linkurl;
            banner.Position = dto.Position;
            if (dto.Isactive.HasValue)
            {
                banner.Isactive = dto.Isactive.Value;
            }

            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Banners.Any(e => e.Bannerid == id)) return NotFound(new ApiErrorDto("Banner không tồn tại.", null));
                throw;
            }
            return Ok(MapToDto(banner));
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteBanner(int id)
        {
            var banner = await _context.Banners.FindAsync(id);
            if (banner == null) return NotFound(new ApiErrorDto("Banner không tồn tại.", null));
            _context.Banners.Remove(banner);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
