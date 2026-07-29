using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Inventory;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class InventoryController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public InventoryController(ECommerceContext context) => _context = context;

        private int? GetClaimUserId()
        {
            var value = User.FindFirst("userid")?.Value;
            return int.TryParse(value, out var userId) ? userId : null;
        }

        private static InventoryItemDto MapToDto(Inventoryitem i) => new InventoryItemDto(
            i.Imei,
            i.Variantid,
            i.Status,
            i.Importedat,
            i.Variant?.Sku,
            i.Variant?.Product?.Productname,
            i.Warrantystartdate,
            i.Warrantyenddate,
            i.Warrantystatus
        );

        [HttpGet]
        [Authorize(Roles = "Admin,Manager,Warehouse,Warranty,Consultant")]
        public async Task<ActionResult<IEnumerable<InventoryItemDto>>> GetInventoryItems()
        {
            var items = await _context.Inventoryitems
                .Include(i => i.Variant)
                .ThenInclude(v => v!.Product)
                .ToListAsync();
            return Ok(items.Select(MapToDto));
        }

        [HttpGet("{imei}")]
        [Authorize(Roles = "Admin,Manager,Warehouse,Warranty,Consultant")]
        public async Task<ActionResult<InventoryItemDto>> GetInventoryItem(string imei)
        {
            var item = await _context.Inventoryitems
                .Include(i => i.Variant)
                .ThenInclude(v => v!.Product)
                .FirstOrDefaultAsync(i => i.Imei == imei);
            if (item == null) return NotFound();
            return Ok(MapToDto(item));
        }

        [HttpGet("variant/{variantId}")]
        [Authorize(Roles = "Admin,Manager,Warehouse,Warranty,Consultant")]
        public async Task<ActionResult<IEnumerable<InventoryItemDto>>> GetByVariant(int variantId)
        {
            var items = await _context.Inventoryitems
                .Include(i => i.Variant)
                .ThenInclude(v => v!.Product)
                .Where(i => i.Variantid == variantId)
                .ToListAsync();
            return Ok(items.Select(MapToDto));
        }

        [HttpGet("status/{status}")]
        [Authorize(Roles = "Admin,Manager,Warehouse,Warranty,Consultant")]
        public async Task<ActionResult<IEnumerable<InventoryItemDto>>> GetByStatus(string status)
        {
            var items = await _context.Inventoryitems
                .Include(i => i.Variant)
                .ThenInclude(v => v!.Product)
                .Where(i => i.Status == status)
                .ToListAsync();
            return Ok(items.Select(MapToDto));
        }

        [HttpGet("low-stock")]
        [Authorize(Roles = "Admin,Manager,Warehouse,Warranty,Consultant")]
        public async Task<ActionResult<IEnumerable<LowStockVariantDto>>> GetLowStock(
            [FromQuery] int threshold = 2)
        {
            threshold = Math.Clamp(threshold, 0, 100);
            var variants = await _context.Productvariants
                .AsNoTracking()
                .Select(variant => new
                {
                    variant.Variantid,
                    VariantSku = variant.Sku,
                    ProductName = variant.Product != null ? variant.Product.Productname : null,
                    InStockQuantity = variant.Inventoryitems.Count(item => item.Status == "InStock")
                })
                .Where(item => item.InStockQuantity <= threshold)
                .OrderBy(item => item.InStockQuantity)
                .ThenBy(item => item.ProductName)
                .ToListAsync();

            return Ok(variants.Select(item => new LowStockVariantDto(
                item.Variantid,
                item.VariantSku,
                item.ProductName,
                item.InStockQuantity,
                threshold)));
        }

        [HttpGet("variant-options")]
        [Authorize(Roles = "Admin,Manager,Warehouse,Warranty,Consultant")]
        public async Task<ActionResult<IEnumerable<InventoryVariantOptionDto>>> GetVariantOptions()
        {
            var variants = await _context.Productvariants
                .AsNoTracking()
                .Where(variant => variant.Product != null && variant.Product.Isactive)
                .OrderBy(variant => variant.Product!.Productname)
                .ThenBy(variant => variant.Sku)
                .Select(variant => new InventoryVariantOptionDto(
                    variant.Variantid,
                    variant.Sku ?? $"SKU-{variant.Variantid}",
                    variant.Product!.Productname,
                    variant.Condition,
                    variant.Inventoryitems.Count(item => item.Status == "InStock")))
                .ToListAsync();

            return Ok(variants);
        }

        [HttpPost("import-batch")]
        [Authorize(Roles = "Admin,Warehouse")]
        public async Task<ActionResult<BatchImportInventoryResultDto>> ImportBatch(
            [FromBody] BatchImportInventoryRequestDto dto)
        {
            if (!dto.Variantid.HasValue)
                return BadRequest(new { message = "Vui lòng chọn đúng sản phẩm và SKU cần nhập kho." });

            var variant = await _context.Productvariants
                .Include(item => item.Product)
                .FirstOrDefaultAsync(item => item.Variantid == dto.Variantid.Value);
            if (variant == null)
                return BadRequest(new { message = "Sản phẩm hoặc SKU đã chọn không tồn tại." });

            var normalizedImeis = dto.Imeis
                .Select(imei => imei?.Trim() ?? string.Empty)
                .Where(imei => !string.IsNullOrWhiteSpace(imei))
                .ToList();
            if (normalizedImeis.Count == 0)
                return BadRequest(new { message = "Vui lòng nhập ít nhất một IMEI." });

            var invalidImeis = normalizedImeis
                .Where(imei => imei.Length != 15 || imei.Any(character => !char.IsDigit(character)))
                .Distinct()
                .ToList();
            if (invalidImeis.Count > 0)
            {
                return BadRequest(new
                {
                    message = $"IMEI phải gồm đúng 15 chữ số. Dữ liệu không hợp lệ: {string.Join(", ", invalidImeis.Take(5))}."
                });
            }

            var duplicatedInRequest = normalizedImeis
                .GroupBy(imei => imei)
                .Where(group => group.Count() > 1)
                .Select(group => group.Key)
                .ToList();
            if (duplicatedInRequest.Count > 0)
            {
                return BadRequest(new
                {
                    message = $"Danh sách đang chứa IMEI trùng: {string.Join(", ", duplicatedInRequest.Take(5))}."
                });
            }

            var existingImeis = await _context.Inventoryitems
                .Where(item => normalizedImeis.Contains(item.Imei))
                .Select(item => item.Imei)
                .ToListAsync();
            if (existingImeis.Count > 0)
            {
                return Conflict(new
                {
                    message = $"IMEI đã tồn tại trong hệ thống: {string.Join(", ", existingImeis.Take(5))}."
                });
            }

            var importedAt = dto.Importedat ?? DateTime.UtcNow;
            var userId = GetClaimUserId();
            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                foreach (var imei in normalizedImeis)
                {
                    var item = new Inventoryitem
                    {
                        Imei = imei,
                        Variantid = variant.Variantid,
                        Status = "InStock",
                        Importedat = importedAt
                    };
                    item.Inventorytransactions.Add(new Inventorytransaction
                    {
                        Userid = userId,
                        Transactiontype = "Import",
                        Fromstatus = null,
                        Tostatus = "InStock",
                        Note = $"Nhập kho theo SKU {variant.Sku}.",
                        Createdat = DateTime.UtcNow
                    });
                    _context.Inventoryitems.Add(item);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (DbUpdateException)
            {
                await transaction.RollbackAsync();
                return Conflict(new { message = "Không thể nhập kho vì có IMEI bị trùng hoặc dữ liệu vừa thay đổi." });
            }

            return Ok(new BatchImportInventoryResultDto(
                variant.Variantid,
                variant.Sku ?? $"SKU-{variant.Variantid}",
                normalizedImeis.Count,
                normalizedImeis));
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Warehouse")]
        public async Task<ActionResult<InventoryItemDto>> PostInventoryItem([FromBody] CreateInventoryItemRequestDto dto)
        {
            var imei = dto.Imei.Trim();
            if (imei.Length != 15 || imei.Any(character => !char.IsDigit(character)))
                return BadRequest(new { message = "IMEI phải gồm đúng 15 chữ số." });
            if (!dto.Variantid.HasValue ||
                !await _context.Productvariants.AnyAsync(variant => variant.Variantid == dto.Variantid.Value))
                return BadRequest(new { message = "Sản phẩm hoặc SKU đã chọn không tồn tại." });
            if (await _context.Inventoryitems.AnyAsync(item => item.Imei == imei))
                return Conflict(new { message = "IMEI đã tồn tại trong hệ thống." });

            var item = new Inventoryitem
            {
                Imei = imei,
                Variantid = dto.Variantid,
                Status = dto.Status ?? "InStock",
                Importedat = dto.Importedat ?? DateTime.UtcNow,
                Warrantystartdate = dto.Warrantystartdate,
                Warrantyenddate = dto.Warrantyenddate,
                Warrantystatus = dto.Warrantystatus
            };

            item.Inventorytransactions.Add(new Inventorytransaction
            {
                Userid = GetClaimUserId(),
                Transactiontype = "Import",
                Fromstatus = null,
                Tostatus = item.Status ?? "InStock",
                Note = "Inventory item created manually.",
                Createdat = DateTime.UtcNow
            });
            _context.Inventoryitems.Add(item);
            await _context.SaveChangesAsync();

            var createdItem = await _context.Inventoryitems
                .Include(i => i.Variant)
                .ThenInclude(v => v!.Product)
                .FirstOrDefaultAsync(i => i.Imei == item.Imei);

            return CreatedAtAction(nameof(GetInventoryItem), new { imei = item.Imei }, MapToDto(createdItem!));
        }

        [HttpPut("{imei}")]
        [Authorize(Roles = "Admin,Warehouse")]
        public async Task<IActionResult> PutInventoryItem(string imei, [FromBody] UpdateInventoryItemRequestDto dto)
        {
            var item = await _context.Inventoryitems.FindAsync(imei);
            if (item == null) return NotFound();

            var previousStatus = item.Status;
            item.Variantid = dto.Variantid;
            item.Status = dto.Status;
            if (dto.Importedat.HasValue)
            {
                item.Importedat = dto.Importedat.Value;
            }
            item.Warrantystartdate = dto.Warrantystartdate;
            item.Warrantyenddate = dto.Warrantyenddate;
            item.Warrantystatus = dto.Warrantystatus;

            if (!string.Equals(previousStatus, item.Status, StringComparison.OrdinalIgnoreCase))
            {
                _context.Inventorytransactions.Add(new Inventorytransaction
                {
                    Imei = item.Imei,
                    Userid = GetClaimUserId(),
                    Transactiontype = item.Status == "Defective" ? "Defective" : "Adjustment",
                    Fromstatus = previousStatus,
                    Tostatus = item.Status ?? "Unknown",
                    Note = "Inventory status adjusted manually.",
                    Createdat = DateTime.UtcNow
                });
            }

            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Inventoryitems.Any(e => e.Imei == imei)) return NotFound();
                throw;
            }

            var updatedItem = await _context.Inventoryitems
                .Include(i => i.Variant)
                .ThenInclude(v => v!.Product)
                .FirstOrDefaultAsync(i => i.Imei == imei);

            return Ok(MapToDto(updatedItem!));
        }

        [HttpDelete("{imei}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteInventoryItem(string imei)
        {
            var item = await _context.Inventoryitems.FindAsync(imei);
            if (item == null) return NotFound();
            if (await _context.Inventorytransactions.AnyAsync(transaction => transaction.Imei == imei))
            {
                return Conflict(new
                {
                    message = "Không thể xóa IMEI đã có lịch sử giao dịch kho."
                });
            }
            _context.Inventoryitems.Remove(item);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
