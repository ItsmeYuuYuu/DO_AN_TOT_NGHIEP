using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Attributes;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ECommerceBackend.DTOs.Common;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AttributeValuesController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public AttributeValuesController(ECommerceContext context) => _context = context;

        private static AttributeValueDto MapValueToDto(Attributevalue v) => new AttributeValueDto(
            v.Valueid,
            v.Attributeid,
            v.Valuename,
            v.Attribute?.Attributename
        );

        [HttpGet]
        public async Task<ActionResult<IEnumerable<AttributeValueDto>>> GetAttributeValues()
        {
            var values = await _context.Attributevalues
                .Include(v => v.Attribute)
                .ToListAsync();
            return Ok(values.Select(MapValueToDto));
        }

        [HttpGet("attribute/{attributeId}")]
        public async Task<ActionResult<IEnumerable<AttributeValueDto>>> GetValuesByAttribute(int attributeId)
        {
            var values = await _context.Attributevalues
                .Include(v => v.Attribute)
                .Where(v => v.Attributeid == attributeId)
                .ToListAsync();
            return Ok(values.Select(MapValueToDto));
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<AttributeValueDto>> PostAttributeValue([FromBody] CreateAttributeValueRequestDto dto)
        {
            var attrExists = await _context.Attributes.AnyAsync(a => a.Attributeid == dto.Attributeid);
            if (!attrExists) return BadRequest(new ApiErrorDto("AttributeId không tồn tại.", null));

            var val = new Attributevalue
            {
                Attributeid = dto.Attributeid,
                Valuename = dto.Valuename
            };

            _context.Attributevalues.Add(val);
            await _context.SaveChangesAsync();

            var createdVal = await _context.Attributevalues
                .Include(v => v.Attribute)
                .FirstOrDefaultAsync(v => v.Valueid == val.Valueid);

            return Ok(MapValueToDto(createdVal!));
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> PutAttributeValue(int id, [FromBody] UpdateAttributeValueRequestDto dto)
        {
            var val = await _context.Attributevalues
                .Include(v => v.Attribute)
                .FirstOrDefaultAsync(v => v.Valueid == id);
                
            if (val == null) return NotFound();

            val.Valuename = dto.Valuename;

            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Attributevalues.Any(e => e.Valueid == id)) return NotFound();
                throw;
            }

            return Ok(MapValueToDto(val));
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteAttributeValue(int id)
        {
            var val = await _context.Attributevalues.FindAsync(id);
            if (val == null) return NotFound();

            _context.Attributevalues.Remove(val);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
