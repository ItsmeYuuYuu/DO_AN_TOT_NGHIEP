using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Categories;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CategoriesController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public CategoriesController(ECommerceContext context) => _context = context;

        // GET: api/Categories
        [HttpGet]
        public async Task<ActionResult<IEnumerable<CategoryDto>>> GetCategories()
        {
            var categories = await _context.Categories.ToListAsync();
            return Ok(categories.Select(c => new CategoryDto(c.Categoryid, c.Categoryname, c.Description)));
        }

        // GET: api/Categories/5
        [HttpGet("{id}")]
        public async Task<ActionResult<CategoryDto>> GetCategory(int id)
        {
            var category = await _context.Categories.FindAsync(id);
            if (category == null) return NotFound();
            return Ok(new CategoryDto(category.Categoryid, category.Categoryname, category.Description));
        }

        // POST: api/Categories
        [HttpPost]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
        public async Task<ActionResult<CategoryDto>> PostCategory([FromBody] CreateCategoryRequestDto dto)
        {
            var category = new Category
            {
                Categoryname = dto.Categoryname,
                Description = dto.Description
            };
            _context.Categories.Add(category);
            await _context.SaveChangesAsync();
            
            var responseDto = new CategoryDto(category.Categoryid, category.Categoryname, category.Description);
            return CreatedAtAction(nameof(GetCategory), new { id = category.Categoryid }, responseDto);
        }

        // PUT: api/Categories/5
        [HttpPut("{id}")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
        public async Task<IActionResult> PutCategory(int id, [FromBody] UpdateCategoryRequestDto dto)
        {
            var category = await _context.Categories.FindAsync(id);
            if (category == null) return NotFound();

            category.Categoryname = dto.Categoryname;
            category.Description = dto.Description;

            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Categories.Any(e => e.Categoryid == id)) return NotFound();
                throw;
            }
            
            var responseDto = new CategoryDto(category.Categoryid, category.Categoryname, category.Description);
            return Ok(responseDto);
        }

        // DELETE: api/Categories/5
        [HttpDelete("{id}")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteCategory(int id)
        {
            var category = await _context.Categories.FindAsync(id);
            if (category == null) return NotFound();
            _context.Categories.Remove(category);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
