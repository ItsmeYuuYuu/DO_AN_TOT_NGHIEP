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
        [Authorize(Roles = "Admin,Manager,Warehouse")]
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

        [HttpPost]
        [Authorize(Roles = "Admin,Warehouse")]
        public async Task<ActionResult<InventoryItemDto>> PostInventoryItem([FromBody] CreateInventoryItemRequestDto dto)
        {
            var item = new Inventoryitem
            {
                Imei = dto.Imei,
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
