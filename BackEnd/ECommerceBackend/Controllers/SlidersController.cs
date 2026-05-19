using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Sliders;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SlidersController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public SlidersController(ECommerceContext context) => _context = context;

        private static SliderDto MapToDto(Slider s) => new SliderDto(
            s.Sliderid,
            s.Title,
            s.Imageurl,
            s.Linkurl,
            s.Displayorder,
            s.Isactive
        );

        [HttpGet]
        public async Task<ActionResult<IEnumerable<SliderDto>>> GetSliders()
        {
            var sliders = await _context.Sliders.OrderBy(s => s.Displayorder).ToListAsync();
            return Ok(sliders.Select(MapToDto));
        }

        [HttpGet("active")]
        public async Task<ActionResult<IEnumerable<SliderDto>>> GetActiveSliders()
        {
            var sliders = await _context.Sliders.Where(s => s.Isactive == true).OrderBy(s => s.Displayorder).ToListAsync();
            return Ok(sliders.Select(MapToDto));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<SliderDto>> GetSlider(int id)
        {
            var slider = await _context.Sliders.FindAsync(id);
            if (slider == null) return NotFound();
            return Ok(MapToDto(slider));
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<SliderDto>> PostSlider([FromBody] CreateSliderRequestDto dto)
        {
            var slider = new Slider
            {
                Title = dto.Title,
                Imageurl = dto.Imageurl,
                Linkurl = dto.Linkurl,
                Displayorder = dto.Displayorder,
                Isactive = dto.Isactive ?? true
            };

            _context.Sliders.Add(slider);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetSlider), new { id = slider.Sliderid }, MapToDto(slider));
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> PutSlider(int id, [FromBody] UpdateSliderRequestDto dto)
        {
            var slider = await _context.Sliders.FindAsync(id);
            if (slider == null) return NotFound();

            slider.Title = dto.Title;
            slider.Imageurl = dto.Imageurl;
            slider.Linkurl = dto.Linkurl;
            slider.Displayorder = dto.Displayorder;
            if (dto.Isactive.HasValue)
            {
                slider.Isactive = dto.Isactive.Value;
            }

            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Sliders.Any(e => e.Sliderid == id)) return NotFound();
                throw;
            }
            return Ok(MapToDto(slider));
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteSlider(int id)
        {
            var slider = await _context.Sliders.FindAsync(id);
            if (slider == null) return NotFound();
            _context.Sliders.Remove(slider);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
