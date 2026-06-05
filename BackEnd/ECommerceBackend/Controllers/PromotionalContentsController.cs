using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.PromotionalContents;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PromotionalContentsController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public PromotionalContentsController(ECommerceContext context) => _context = context;

        private static PromotionalContentDto MapToDto(Promotionalcontent p) => new PromotionalContentDto(
            p.Contentid,
            p.Contenttype,
            p.Title,
            p.Imageurl,
            p.Linkurl,
            p.Displayorder,
            p.Isactive,
            p.Createdat
        );

        // GET: api/PromotionalContents
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PromotionalContentDto>>> GetPromotionalContents([FromQuery] string? type)
        {
            IQueryable<Promotionalcontent> query = _context.Promotionalcontents;
            if (!string.IsNullOrEmpty(type))
            {
                query = query.Where(p => p.Contenttype == type);
            }
            var list = await query.OrderBy(p => p.Displayorder).ThenByDescending(p => p.Createdat).ToListAsync();
            return Ok(list.Select(MapToDto));
        }

        // GET: api/PromotionalContents/active
        [HttpGet("active")]
        public async Task<ActionResult<IEnumerable<PromotionalContentDto>>> GetActivePromotionalContents([FromQuery] string? type)
        {
            IQueryable<Promotionalcontent> query = _context.Promotionalcontents.Where(p => p.Isactive == true);
            if (!string.IsNullOrEmpty(type))
            {
                query = query.Where(p => p.Contenttype == type);
            }
            var list = await query.OrderBy(p => p.Displayorder).ThenByDescending(p => p.Createdat).ToListAsync();
            return Ok(list.Select(MapToDto));
        }

        // GET: api/PromotionalContents/5
        [HttpGet("{id}")]
        public async Task<ActionResult<PromotionalContentDto>> GetPromotionalContent(int id)
        {
            var p = await _context.Promotionalcontents.FindAsync(id);
            if (p == null) return NotFound();
            return Ok(MapToDto(p));
        }

        // POST: api/PromotionalContents
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<PromotionalContentDto>> PostPromotionalContent([FromBody] CreatePromotionalContentRequestDto dto)
        {
            var p = new Promotionalcontent
            {
                Contenttype = dto.Contenttype,
                Title = dto.Title,
                Imageurl = dto.Imageurl,
                Linkurl = dto.Linkurl,
                Displayorder = dto.Displayorder ?? 0,
                Isactive = dto.Isactive ?? true,
                Createdat = DateTime.UtcNow
            };

            _context.Promotionalcontents.Add(p);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPromotionalContent), new { id = p.Contentid }, MapToDto(p));
        }

        // PUT: api/PromotionalContents/5
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> PutPromotionalContent(int id, [FromBody] UpdatePromotionalContentRequestDto dto)
        {
            var p = await _context.Promotionalcontents.FindAsync(id);
            if (p == null) return NotFound();

            p.Contenttype = dto.Contenttype;
            p.Title = dto.Title;
            p.Imageurl = dto.Imageurl;
            p.Linkurl = dto.Linkurl;
            p.Displayorder = dto.Displayorder ?? 0;
            p.Isactive = dto.Isactive ?? true;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Promotionalcontents.Any(e => e.Contentid == id)) return NotFound();
                throw;
            }

            return Ok(MapToDto(p));
        }

        // DELETE: api/PromotionalContents/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeletePromotionalContent(int id)
        {
            var p = await _context.Promotionalcontents.FindAsync(id);
            if (p == null) return NotFound();

            _context.Promotionalcontents.Remove(p);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
