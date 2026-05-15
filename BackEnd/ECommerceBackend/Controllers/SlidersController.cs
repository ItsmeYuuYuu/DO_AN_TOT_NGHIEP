using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SlidersController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public SlidersController(ECommerceContext context) => _context = context;

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Slider>>> GetSliders()
            => await _context.Sliders.OrderBy(s => s.Displayorder).ToListAsync();

        [HttpGet("active")]
        public async Task<ActionResult<IEnumerable<Slider>>> GetActiveSliders()
            => await _context.Sliders.Where(s => s.Isactive == true).OrderBy(s => s.Displayorder).ToListAsync();

        [HttpGet("{id}")]
        public async Task<ActionResult<Slider>> GetSlider(int id)
        {
            var slider = await _context.Sliders.FindAsync(id);
            if (slider == null) return NotFound();
            return slider;
        }

        [HttpPost]
        public async Task<ActionResult<Slider>> PostSlider(Slider slider)
        {
            _context.Sliders.Add(slider);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetSlider), new { id = slider.Sliderid }, slider);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutSlider(int id, Slider slider)
        {
            if (id != slider.Sliderid) return BadRequest();
            _context.Entry(slider).State = EntityState.Modified;
            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Sliders.Any(e => e.Sliderid == id)) return NotFound();
                throw;
            }
            return NoContent();
        }

        [HttpDelete("{id}")]
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
