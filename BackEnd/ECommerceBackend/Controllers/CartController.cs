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
    public class CartItemJson
    {
        public int VariantId { get; set; }
        public int Quantity { get; set; }
        public DateTime CreatedAt { get; set; }
    }

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
                .FirstOrDefaultAsync(c => c.Userid == userId);

            if (cart == null)
            {
                cart = new Cart
                {
                    Userid = userId,
                    Createdat = DateTime.UtcNow,
                    Updatedat = DateTime.UtcNow,
                    Cartcontent = "[]"
                };
                _context.Carts.Add(cart);
                await _context.SaveChangesAsync();
            }

            return cart;
        }
        
        private List<CartItemJson> GetCartItemsFromJson(string? json)
        {
            if (string.IsNullOrWhiteSpace(json))
                return new List<CartItemJson>();
            try
            {
                return JsonSerializer.Deserialize<List<CartItemJson>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new List<CartItemJson>();
            }
            catch
            {
                return new List<CartItemJson>();
            }
        }
        
        private void SaveCartItemsToJson(Cart cart, List<CartItemJson> items)
        {
            cart.Cartcontent = JsonSerializer.Serialize(items);
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

        private async Task<CartDto> MapToCartDtoAsync(Cart cart)
        {
            var itemsJson = GetCartItemsFromJson(cart.Cartcontent);
            if (itemsJson.Count == 0)
            {
                return new CartDto(cart.Userid, new List<CartItemDto>());
            }

            var variantIds = itemsJson.Select(i => i.VariantId).ToList();
            var variants = await _context.Productvariants
                .Include(v => v.Product)
                .Where(v => variantIds.Contains(v.Variantid))
                .ToDictionaryAsync(v => v.Variantid);

            var items = new List<CartItemDto>();
            foreach (var ci in itemsJson)
            {
                if (!variants.TryGetValue(ci.VariantId, out var variant)) continue;
                
                var product = variant.Product;
                
                // Get image url from JSON string
                string imageUrl = "";
                if (!string.IsNullOrWhiteSpace(variant.Imageurls))
                {
                    try
                    {
                        var urls = JsonSerializer.Deserialize<List<string>>(variant.Imageurls);
                        if (urls != null && urls.Count > 0)
                        {
                            imageUrl = urls[0];
                        }
                    }
                    catch { }
                }

                string productName = product?.Productname ?? "Sản phẩm";
                string variantName = GetVariantName(variant);
                decimal price = variant.Saleprice ?? variant.Baseprice;

                items.Add(new CartItemDto(
                    VariantId: variant.Variantid,
                    ProductId: variant.Productid ?? 0,
                    ProductName: productName,
                    VariantName: variantName,
                    Sku: variant.Sku ?? "",
                    ImageUrl: imageUrl,
                    Price: price,
                    Quantity: ci.Quantity
                ));
            }

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
                return Ok(await MapToCartDtoAsync(cart));
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
                var variant = await _context.Productvariants
                    .Include(item => item.Product)
                    .FirstOrDefaultAsync(item => item.Variantid == dto.VariantId);
                if (variant == null)
                    return NotFound(new ApiErrorDto("Không tìm thấy phiên bản sản phẩm này."));
                if (variant.Product?.Isactive == false)
                    return Conflict(new ApiErrorDto("Sản phẩm này đã ngừng kinh doanh."));

                var cart = await GetOrCreateCartAsync(userId);
                var items = GetCartItemsFromJson(cart.Cartcontent);
                var existingItem = items.FirstOrDefault(ci => ci.VariantId == dto.VariantId);
                
                var availableStock = await _context.Inventoryitems.CountAsync(item =>
                    item.Variantid == dto.VariantId &&
                    item.Status == "InStock");
                    
                var requestedQuantity = (existingItem?.Quantity ?? 0) + dto.Quantity;
                if (requestedQuantity > availableStock)
                {
                    return Conflict(new ApiErrorDto(
                        $"Chỉ còn {availableStock} sản phẩm sẵn sàng bán."));
                }

                if (existingItem != null)
                {
                    existingItem.Quantity += dto.Quantity;
                }
                else
                {
                    items.Add(new CartItemJson
                    {
                        VariantId = dto.VariantId,
                        Quantity = dto.Quantity,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                SaveCartItemsToJson(cart, items);
                cart.Updatedat = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return Ok(await MapToCartDtoAsync(cart));
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
                var items = GetCartItemsFromJson(cart.Cartcontent);
                var existingItem = items.FirstOrDefault(ci => ci.VariantId == dto.VariantId);

                if (existingItem == null)
                {
                    return NotFound(new ApiErrorDto("Sản phẩm không có trong giỏ hàng."));
                }

                if (dto.Quantity <= 0)
                {
                    items.Remove(existingItem);
                }
                else
                {
                    var isActive = await _context.Productvariants.AnyAsync(item =>
                        item.Variantid == dto.VariantId &&
                        item.Product != null &&
                        item.Product.Isactive);
                    if (!isActive)
                    {
                        return Conflict(new ApiErrorDto("Sản phẩm này đã ngừng kinh doanh."));
                    }

                    var availableStock = await _context.Inventoryitems.CountAsync(item =>
                        item.Variantid == dto.VariantId &&
                        item.Status == "InStock");
                    if (dto.Quantity > availableStock)
                    {
                        return Conflict(new ApiErrorDto(
                            $"Chỉ còn {availableStock} sản phẩm sẵn sàng bán."));
                    }
                    existingItem.Quantity = dto.Quantity;
                }

                SaveCartItemsToJson(cart, items);
                cart.Updatedat = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return Ok(await MapToCartDtoAsync(cart));
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
                var items = GetCartItemsFromJson(cart.Cartcontent);
                var existingItem = items.FirstOrDefault(ci => ci.VariantId == variantId);

                if (existingItem != null)
                {
                    items.Remove(existingItem);
                    SaveCartItemsToJson(cart, items);
                    cart.Updatedat = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }

                return Ok(await MapToCartDtoAsync(cart));
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
                var items = GetCartItemsFromJson(cart.Cartcontent);

                if (dto.Items != null && dto.Items.Count > 0)
                {
                    foreach (var item in dto.Items)
                    {
                        if (item.Quantity <= 0) continue;

                        var variant = await _context.Productvariants
                            .Include(productVariant => productVariant.Product)
                            .FirstOrDefaultAsync(productVariant => productVariant.Variantid == item.VariantId);
                        if (variant == null || variant.Product?.Isactive == false) continue;

                        var existingItem = items.FirstOrDefault(ci => ci.VariantId == item.VariantId);
                        var availableStock = await _context.Inventoryitems.CountAsync(inventory =>
                            inventory.Variantid == item.VariantId &&
                            inventory.Status == "InStock");
                        if (availableStock <= 0)
                            continue;

                        if (existingItem != null)
                        {
                            existingItem.Quantity = Math.Min(
                                existingItem.Quantity + item.Quantity,
                                availableStock);
                        }
                        else
                        {
                            items.Add(new CartItemJson
                            {
                                VariantId = item.VariantId,
                                Quantity = Math.Min(item.Quantity, availableStock),
                                CreatedAt = DateTime.UtcNow
                            });
                        }
                    }

                    SaveCartItemsToJson(cart, items);
                    cart.Updatedat = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }

                return Ok(await MapToCartDtoAsync(cart));
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
                var items = GetCartItemsFromJson(cart.Cartcontent);

                if (items.Any())
                {
                    items.Clear();
                    SaveCartItemsToJson(cart, items);
                    cart.Updatedat = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }

                return Ok(await MapToCartDtoAsync(cart));
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new ApiErrorDto(ex.Message));
            }
        }
    }
}
