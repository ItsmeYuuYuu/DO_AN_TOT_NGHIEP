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
using ECommerceBackend.Authorization;

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
            r.Variant?.Sku,
            r.Variant?.Product?.Productname,
            r.Customer?.Email,
            r.Customer?.Phone
        );

        public record ReviewSummaryDto(
            int Total,
            int FiveStar,
            int FourStar,
            int ThreeStar,
            int LowStar,
            double AverageRating
        );

        private async Task<Customer?> GetCurrentCustomerAsync()
        {
            var claimUserId = User.FindFirst("userid")?.Value;
            if (!int.TryParse(claimUserId, out var userId)) return null;

            var dbUser = await _context.Users.FindAsync(userId);
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
                Phone = dbUser.Phone ?? $"USER-{dbUser.Userid}",
                Createdat = DateTime.UtcNow
            };
            _context.Customers.Add(newCustomer);
            await _context.SaveChangesAsync();
            return newCustomer;
        }

        private async Task<bool> IsOwnerOrAdminAsync(int customerId)
        {
            if (User.IsInRole("Admin") ||
                User.HasClaim(AppPermissions.ClaimType, AppPermissions.Wildcard) ||
                User.HasClaim(AppPermissions.ClaimType, AppPermissions.ReviewsManage))
            {
                return true;
            }
            var cust = await GetCurrentCustomerAsync();
            return cust != null && cust.Customerid == customerId;
        }

        [HttpGet("summary")]
        public async Task<ActionResult<ReviewSummaryDto>> GetReviewSummary()
        {
            var reviews = await _context.Reviews.AsNoTracking().ToListAsync();
            var total = reviews.Count;
            if (total == 0) return Ok(new ReviewSummaryDto(0, 0, 0, 0, 0, 0));

            var five = reviews.Count(r => r.Rating == 5);
            var four = reviews.Count(r => r.Rating == 4);
            var three = reviews.Count(r => r.Rating == 3);
            var low = reviews.Count(r => r.Rating is 1 or 2);
            var avg = reviews.Where(r => r.Rating.HasValue).Select(r => (double)r.Rating!.Value).DefaultIfEmpty(0).Average();

            return Ok(new ReviewSummaryDto(total, five, four, three, low, Math.Round(avg, 1)));
        }

        [HttpGet("admin")]
        [HasPermission(AppPermissions.ReviewsView)]
        public async Task<ActionResult<PagedResultDto<ReviewDto>>> GetAdminReviews(
            [FromQuery] string? query = null,
            [FromQuery] int? rating = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 5, 100);

            var queryable = _context.Reviews
                .AsNoTracking()
                .Include(r => r.Customer)
                .Include(r => r.Variant)
                    .ThenInclude(v => v!.Product)
                .AsQueryable();

            if (rating.HasValue && rating.Value is >= 1 and <= 5)
            {
                queryable = queryable.Where(r => r.Rating == rating.Value);
            }

            var keyword = query?.Trim().ToLowerInvariant();
            if (!string.IsNullOrWhiteSpace(keyword))
            {
                queryable = queryable.Where(r =>
                    (r.Comment != null && r.Comment.ToLower().Contains(keyword)) ||
                    (r.Customer != null && r.Customer.Fullname.ToLower().Contains(keyword)) ||
                    (r.Customer != null && r.Customer.Email != null && r.Customer.Email.ToLower().Contains(keyword)) ||
                    (r.Variant != null && r.Variant.Sku != null && r.Variant.Sku.ToLower().Contains(keyword)) ||
                    (r.Variant != null && r.Variant.Product != null && r.Variant.Product.Productname.ToLower().Contains(keyword)));
            }

            var totalCount = await queryable.CountAsync();
            var reviews = await queryable
                .OrderByDescending(r => r.Createdat ?? DateTime.MinValue)
                .ThenByDescending(r => r.Reviewid)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new PagedResultDto<ReviewDto>
            {
                Items = reviews.Select(MapToDto),
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            });
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ReviewDto>>> GetReviews()
        {
            var reviews = await _context.Reviews
                .Include(r => r.Customer)
                .Include(r => r.Variant)
                    .ThenInclude(v => v!.Product)
                .ToListAsync();
            return Ok(reviews.Select(MapToDto));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ReviewDto>> GetReview(int id)
        {
            var review = await _context.Reviews
                .Include(r => r.Customer)
                .Include(r => r.Variant)
                    .ThenInclude(v => v!.Product)
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
                    .ThenInclude(v => v!.Product)
                .Where(r => r.Variantid == variantId)
                .OrderByDescending(r => r.Createdat)
                .ToListAsync();
            return Ok(reviews.Select(MapToDto));
        }

        [HttpGet("product/{productId}")]
        public async Task<ActionResult<IEnumerable<ReviewDto>>> GetReviewsByProduct(int productId)
        {
            var reviews = await _context.Reviews
                .Include(r => r.Customer)
                .Include(r => r.Variant)
                    .ThenInclude(v => v!.Product)
                .Where(r => r.Variant != null && r.Variant.Productid == productId)
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
                    .ThenInclude(v => v!.Product)
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

            var claimUserId = User.FindFirst("userid")?.Value;
            var currentUserId = int.TryParse(claimUserId, out var parsedUserId)
                ? parsedUserId
                : (int?)null;

            var hasCompletedPurchase = await _context.Orderitems
                .AnyAsync(item => item.Order != null &&
                    (item.Order.Customerid == cust.Customerid ||
                     (currentUserId.HasValue && item.Order.Userid == currentUserId.Value)) &&
                    item.Order.Orderstatus == "Completed" &&
                    item.ImeiNavigation != null &&
                    item.ImeiNavigation.Variantid == dto.Variantid);
            if (!hasCompletedPurchase)
                return BadRequest(new ApiErrorDto("Chỉ khách hàng đã nhận sản phẩm mới có thể đánh giá biến thể này.", null));

            var existingReview = await _context.Reviews
                .FirstOrDefaultAsync(review => review.Customerid == cust.Customerid && review.Variantid == dto.Variantid);
            if (existingReview != null)
                return Conflict(new ApiErrorDto("Bạn đã đánh giá sản phẩm này. Vui lòng sửa đánh giá hiện có thay vì tạo mới.", null));

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
                    .ThenInclude(v => v!.Product)
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
                    .ThenInclude(v => v!.Product)
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
