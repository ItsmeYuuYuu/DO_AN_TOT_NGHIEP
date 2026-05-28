using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Reviews;
using ECommerceBackend.DTOs.Common;
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

        private async Task<Customer?> GetCurrentCustomerAsync()
        {
            var claimUserId = User.FindFirst("userid")?.Value;
            if (string.IsNullOrEmpty(claimUserId)) return null;

            var dbUser = await _context.Users.FindAsync(int.Parse(claimUserId));
            if (dbUser == null) return null;

            if (!string.IsNullOrEmpty(dbUser.Email))
            {
                var custByEmail = await _context.Customers.FirstOrDefaultAsync(c => c.Email == dbUser.Email);
                if (custByEmail != null) return custByEmail;
            }

            if (!string.IsNullOrEmpty(dbUser.Phone))
            {
                var custByPhone = await _context.Customers.FirstOrDefaultAsync(c => c.Phone == dbUser.Phone);
                if (custByPhone != null) return custByPhone;
            }

            if (string.IsNullOrEmpty(dbUser.Email) && string.IsNullOrEmpty(dbUser.Phone)) return null;

            var newCustomer = new Customer
            {
                Fullname = dbUser.Fullname,
                Email = dbUser.Email,
                Phone = dbUser.Phone,
                Createdat = DateTime.UtcNow
            };
            _context.Customers.Add(newCustomer);
            await _context.SaveChangesAsync();
            return newCustomer;
        }

        private async Task<bool> IsOwnerOrAdminAsync(int customerId)
        {
            if (User.IsInRole("Admin") || User.IsInRole("Staff")) return true;
            var cust = await GetCurrentCustomerAsync();
            return cust != null && cust.Customerid == customerId;
        }

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

        [HttpGet("me")]
        [Authorize]
        public async Task<ActionResult<IEnumerable<ReviewDto>>> GetMyReviews()
        {
            var cust = await GetCurrentCustomerAsync();
            if (cust == null) return Ok(new List<ReviewDto>());

            var reviews = await _context.Reviews
                .Include(r => r.Customer)
                .Include(r => r.Variant)
                .Where(r => r.Customerid == cust.Customerid)
                .OrderByDescending(r => r.Createdat)
                .ToListAsync();
            return Ok(reviews.Select(MapToDto));
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<ReviewDto>> PostReview([FromBody] CreateReviewRequestDto dto)
        {
            var cust = await GetCurrentCustomerAsync();
            if (cust == null) 
                return BadRequest(new ApiErrorDto("Tài khoản chưa có Email hoặc Số điện thoại để định danh.", null));

            var variantExists = await _context.Productvariants.AnyAsync(v => v.Variantid == dto.Variantid);
            if (!variantExists) 
                return BadRequest(new ApiErrorDto($"Biến thể sản phẩm (VariantId: {dto.Variantid}) không tồn tại.", null));

            var review = new Review
            {
                Variantid = dto.Variantid,
                Customerid = cust.Customerid,
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
        [Authorize]
        public async Task<IActionResult> PutReview(int id, [FromBody] UpdateReviewRequestDto dto)
        {
            var review = await _context.Reviews.FindAsync(id);
            if (review == null) return NotFound();

            if (!await IsOwnerOrAdminAsync(review.Customerid ?? 0))
                return Forbid();

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
        [Authorize]
        public async Task<IActionResult> DeleteReview(int id)
        {
            var review = await _context.Reviews.FindAsync(id);
            if (review == null) return NotFound();

            if (!await IsOwnerOrAdminAsync(review.Customerid ?? 0))
                return Forbid();

            _context.Reviews.Remove(review);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
