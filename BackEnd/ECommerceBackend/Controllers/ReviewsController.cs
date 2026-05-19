using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Reviews;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReviewsController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public ReviewsController(ECommerceContext context) => _context = context;

        private static ReviewDto MapToDto(Review r) => new ReviewDto(
            r.Reviewid,
            r.Variantid,
            r.Customerid,
            r.Rating,
            r.Comment,
            r.Createdat,
            r.Customer?.Fullname,
            r.Variant?.Sku
        );

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ReviewDto>>> GetReviews()
        {
            var reviews = await _context.Reviews
                .Include(r => r.Customer)
                .Include(r => r.Variant)
                .ToListAsync();
            return Ok(reviews.Select(MapToDto));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ReviewDto>> GetReview(int id)
        {
            var review = await _context.Reviews
                .Include(r => r.Customer)
                .Include(r => r.Variant)
                .FirstOrDefaultAsync(r => r.Reviewid == id);

            if (review == null) return NotFound();
            return Ok(MapToDto(review));
        }

        [HttpGet("variant/{variantId}")]
        public async Task<ActionResult<IEnumerable<ReviewDto>>> GetReviewsByVariant(int variantId)
        {
            var reviews = await _context.Reviews
                .Include(r => r.Customer)
                .Include(r => r.Variant)
                .Where(r => r.Variantid == variantId)
                .OrderByDescending(r => r.Createdat)
                .ToListAsync();
            return Ok(reviews.Select(MapToDto));
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<ReviewDto>> PostReview([FromBody] CreateReviewRequestDto dto)
        {
            var review = new Review
            {
                Variantid = dto.Variantid,
                Customerid = dto.Customerid,
                Rating = dto.Rating,
                Comment = dto.Comment,
                Createdat = DateTime.UtcNow
            };

            _context.Reviews.Add(review);
            await _context.SaveChangesAsync();

            var createdReview = await _context.Reviews
                .Include(r => r.Customer)
                .Include(r => r.Variant)
                .FirstOrDefaultAsync(r => r.Reviewid == review.Reviewid);

            return CreatedAtAction(nameof(GetReview), new { id = review.Reviewid }, MapToDto(createdReview!));
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> PutReview(int id, [FromBody] UpdateReviewRequestDto dto)
        {
            var review = await _context.Reviews.FindAsync(id);
            if (review == null) return NotFound();

            review.Rating = dto.Rating;
            review.Comment = dto.Comment;

            try 
            { 
                await _context.SaveChangesAsync(); 
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Reviews.Any(e => e.Reviewid == id)) return NotFound();
                throw;
            }

            var updatedReview = await _context.Reviews
                .Include(r => r.Customer)
                .Include(r => r.Variant)
                .FirstOrDefaultAsync(r => r.Reviewid == review.Reviewid);

            return Ok(MapToDto(updatedReview!));
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
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
