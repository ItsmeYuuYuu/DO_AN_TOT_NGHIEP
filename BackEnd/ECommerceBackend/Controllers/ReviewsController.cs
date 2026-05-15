using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReviewsController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public ReviewsController(ECommerceContext context) => _context = context;

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Review>>> GetReviews()
            => await _context.Reviews.Include(r => r.Customer).Include(r => r.Variant).ToListAsync();

        [HttpGet("{id}")]
        public async Task<ActionResult<Review>> GetReview(int id)
        {
            var review = await _context.Reviews.Include(r => r.Customer).Include(r => r.Variant)
                .FirstOrDefaultAsync(r => r.Reviewid == id);
            if (review == null) return NotFound();
            return review;
        }

        [HttpGet("variant/{variantId}")]
        public async Task<ActionResult<IEnumerable<Review>>> GetReviewsByVariant(int variantId)
            => await _context.Reviews.Include(r => r.Customer)
                .Where(r => r.Variantid == variantId)
                .OrderByDescending(r => r.Createdat)
                .ToListAsync();

        [HttpPost]
        public async Task<ActionResult<Review>> PostReview(Review review)
        {
            _context.Reviews.Add(review);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetReview), new { id = review.Reviewid }, review);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutReview(int id, Review review)
        {
            if (id != review.Reviewid) return BadRequest();
            _context.Entry(review).State = EntityState.Modified;
            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Reviews.Any(e => e.Reviewid == id)) return NotFound();
                throw;
            }
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteReview(int id)
        {
            var review = await _context.Reviews.FindAsync(id);
            if (review == null) return NotFound();
            _context.Reviews.Remove(review);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
