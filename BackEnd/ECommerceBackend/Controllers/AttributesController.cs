using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Attributes;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AttributesController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public AttributesController(ECommerceContext context) => _context = context;

        private static AttributeDto MapToDto(Models.Attribute a) => new AttributeDto(
            a.Attributeid,
            a.Attributename,
            a.Attributevalues?.Select(MapValueToDto).ToList()
        );

        private static AttributeValueDto MapValueToDto(Attributevalue v) => new AttributeValueDto(
            v.Valueid,
            v.Attributeid,
            v.Valuename,
            v.Attribute?.Attributename
        );

        [HttpGet]
        public async Task<ActionResult<IEnumerable<AttributeDto>>> GetAttributes()
        {
            var attrs = await _context.Attributes
                .Include(a => a.Attributevalues)
                .ToListAsync();
            return Ok(attrs.Select(MapToDto));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<AttributeDto>> GetAttribute(int id)
        {
            var attr = await _context.Attributes
                .Include(a => a.Attributevalues)
                .FirstOrDefaultAsync(a => a.Attributeid == id);
            
            if (attr == null) return NotFound();
            return Ok(MapToDto(attr));
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<AttributeDto>> PostAttribute([FromBody] CreateAttributeRequestDto dto)
        {
            var attr = new Models.Attribute
            {
                Attributename = dto.Attributename
            };

            _context.Attributes.Add(attr);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetAttribute), new { id = attr.Attributeid }, MapToDto(attr));
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> PutAttribute(int id, [FromBody] UpdateAttributeRequestDto dto)
        {
            var attr = await _context.Attributes.FindAsync(id);
            if (attr == null) return NotFound();

            attr.Attributename = dto.Attributename;

            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Attributes.Any(e => e.Attributeid == id)) return NotFound();
                throw;
            }

            return Ok(MapToDto(attr));
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteAttribute(int id)
        {
            var attr = await _context.Attributes.FindAsync(id);
            if (attr == null) return NotFound();

            _context.Attributes.Remove(attr);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
