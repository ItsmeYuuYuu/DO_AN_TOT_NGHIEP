using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Cart;
using ECommerceBackend.DTOs.Common;
using Microsoft.AspNetCore.Authorization;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CartController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public CartController(ECommerceContext context)
        {
            _context = context;
        }

        private int GetUserId()
        {
            var userIdClaim = User.FindFirst("userid")?.Value;
            if (userIdClaim == null || !int.TryParse(userIdClaim, out int userId))
            {
                throw new UnauthorizedAccessException("Không tìm thấy User ID hợp lệ trong Token.");
            }
            return userId;
        }

        private async Task<Cart> GetOrCreateCartAsync(int userId)
        {
            var cart = await _context.Carts
                .Include(c => c.Cartitems)
                    .ThenInclude(ci => ci.Variant)
                        .ThenInclude(v => v.Product)
                .Include(c => c.Cartitems)
                    .ThenInclude(ci => ci.Variant)
                        .ThenInclude(v => v.Productimages)
                .FirstOrDefaultAsync(c => c.Userid == userId);

            if (cart == null)
            {
                cart = new Cart
                {
                    Userid = userId,
                    Createdat = DateTime.UtcNow,
                    Updatedat = DateTime.UtcNow
                };
                _context.Carts.Add(cart);
                await _context.SaveChangesAsync();
            }

            return cart;
        }

        private string GetVariantName(Productvariant variant)
        {
            if (string.IsNullOrEmpty(variant.Specifications))
                return variant.Sku ?? "Mặc định";

            try
            {
                var dict = JsonSerializer.Deserialize<Dictionary<string, string>>(variant.Specifications);
                if (dict != null && dict.Count > 0)
                {
                    var keys = new[] { "Màu sắc", "Màu", "RAM", "Bộ nhớ trong", "Bộ nhớ", "ROM", "Tình trạng" };
                    var parts = new List<string>();
                    foreach (var key in keys)
                    {
                        if (dict.TryGetValue(key, out var val))
                        {
                            parts.Add(val);
                        }
                    }
                    if (parts.Count == 0)
                    {
                        parts.AddRange(dict.Values);
                    }
                    return string.Join(" - ", parts);
                }
            }
            catch
            {
                // Fallback
            }

            return variant.Sku ?? "Mặc định";
        }

        private CartDto MapToCartDto(Cart cart)
        {
            var items = cart.Cartitems.Select(ci =>
            {
                var variant = ci.Variant;
                var product = variant.Product;
                var primaryImg = variant.Productimages.FirstOrDefault(pi => pi.Ismain == true) 
                                 ?? variant.Productimages.FirstOrDefault();

                string imageUrl = primaryImg?.Imageurl ?? "";
                string productName = product?.Productname ?? "Sản phẩm";
                string variantName = GetVariantName(variant);
                decimal price = variant.Saleprice ?? variant.Baseprice;

                return new CartItemDto(
                    VariantId: variant.Variantid,
                    ProductId: variant.Productid ?? 0,
                    ProductName: productName,
                    VariantName: variantName,
                    Sku: variant.Sku ?? "",
                    ImageUrl: imageUrl,
                    Price: price,
                    Quantity: ci.Quantity
                );
            }).ToList();

            return new CartDto(cart.Userid, items);
        }

        // GET: api/Cart
        [HttpGet]
        public async Task<ActionResult<CartDto>> GetCart()
        {
            try
            {
                int userId = GetUserId();
                var cart = await GetOrCreateCartAsync(userId);
                return Ok(MapToCartDto(cart));
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new ApiErrorDto(ex.Message));
            }
        }

        // POST: api/Cart/add
        [HttpPost("add")]
        public async Task<ActionResult<CartDto>> AddToCart([FromBody] AddToCartDto dto)
        {
            try
            {
                int userId = GetUserId();
                if (dto.Quantity <= 0)
                    return BadRequest(new ApiErrorDto("Số lượng thêm vào phải lớn hơn 0."));

                // Verify variant exists
                var variant = await _context.Productvariants.FindAsync(dto.VariantId);
                if (variant == null)
                    return NotFound(new ApiErrorDto("Không tìm thấy phiên bản sản phẩm này."));

                var cart = await GetOrCreateCartAsync(userId);
                var existingItem = cart.Cartitems.FirstOrDefault(ci => ci.Variantid == dto.VariantId);

                if (existingItem != null)
                {
                    existingItem.Quantity += dto.Quantity;
                }
                else
                {
                    cart.Cartitems.Add(new Cartitem
                    {
                        Cartid = cart.Cartid,
                        Variantid = dto.VariantId,
                        Quantity = dto.Quantity,
                        Createdat = DateTime.UtcNow
                    });
                }

                cart.Updatedat = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                // Reload cart to include full navigation objects
                var updatedCart = await GetOrCreateCartAsync(userId);
                return Ok(MapToCartDto(updatedCart));
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new ApiErrorDto(ex.Message));
            }
        }

        // PUT: api/Cart/update-quantity
        [HttpPut("update-quantity")]
        public async Task<ActionResult<CartDto>> UpdateQuantity([FromBody] UpdateCartItemQuantityDto dto)
        {
            try
            {
                int userId = GetUserId();
                var cart = await GetOrCreateCartAsync(userId);
                var existingItem = cart.Cartitems.FirstOrDefault(ci => ci.Variantid == dto.VariantId);

                if (existingItem == null)
                {
                    return NotFound(new ApiErrorDto("Sản phẩm không có trong giỏ hàng."));
                }

                if (dto.Quantity <= 0)
                {
                    _context.Cartitems.Remove(existingItem);
                }
                else
                {
                    existingItem.Quantity = dto.Quantity;
                }

                cart.Updatedat = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                // Reload cart
                var updatedCart = await GetOrCreateCartAsync(userId);
                return Ok(MapToCartDto(updatedCart));
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new ApiErrorDto(ex.Message));
            }
        }

        // DELETE: api/Cart/remove/5
        [HttpDelete("remove/{variantId}")]
        public async Task<ActionResult<CartDto>> RemoveFromCart(int variantId)
        {
            try
            {
                int userId = GetUserId();
                var cart = await GetOrCreateCartAsync(userId);
                var existingItem = cart.Cartitems.FirstOrDefault(ci => ci.Variantid == variantId);

                if (existingItem != null)
                {
                    _context.Cartitems.Remove(existingItem);
                    cart.Updatedat = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }

                var updatedCart = await GetOrCreateCartAsync(userId);
                return Ok(MapToCartDto(updatedCart));
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new ApiErrorDto(ex.Message));
            }
        }

        // POST: api/Cart/merge
        [HttpPost("merge")]
        public async Task<ActionResult<CartDto>> MergeCart([FromBody] MergeCartRequestDto dto)
        {
            try
            {
                int userId = GetUserId();
                var cart = await GetOrCreateCartAsync(userId);

                if (dto.Items != null && dto.Items.Count > 0)
                {
                    foreach (var item in dto.Items)
                    {
                        if (item.Quantity <= 0) continue;

                        var variant = await _context.Productvariants.FindAsync(item.VariantId);
                        if (variant == null) continue;

                        var existingItem = cart.Cartitems.FirstOrDefault(ci => ci.Variantid == item.VariantId);
                        if (existingItem != null)
                        {
                            // Merge by taking the sum of quantities
                            existingItem.Quantity += item.Quantity;
                        }
                        else
                        {
                            cart.Cartitems.Add(new Cartitem
                            {
                                Cartid = cart.Cartid,
                                Variantid = item.VariantId,
                                Quantity = item.Quantity,
                                Createdat = DateTime.UtcNow
                            });
                        }
                    }

                    cart.Updatedat = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }

                var updatedCart = await GetOrCreateCartAsync(userId);
                return Ok(MapToCartDto(updatedCart));
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new ApiErrorDto(ex.Message));
            }
        }

        // DELETE: api/Cart/clear
        [HttpDelete("clear")]
        public async Task<ActionResult<CartDto>> ClearCart()
        {
            try
            {
                int userId = GetUserId();
                var cart = await GetOrCreateCartAsync(userId);

                if (cart.Cartitems.Any())
                {
                    _context.Cartitems.RemoveRange(cart.Cartitems);
                    cart.Updatedat = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }

                var updatedCart = await GetOrCreateCartAsync(userId);
                return Ok(MapToCartDto(updatedCart));
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new ApiErrorDto(ex.Message));
            }
        }
    }
}
