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
        [Authorize(Roles = "Admin,Staff")]
        public async Task<ActionResult<IEnumerable<InventoryItemDto>>> GetInventoryItems()
        {
            var items = await _context.Inventoryitems
                .Include(i => i.Variant)
                .ThenInclude(v => v!.Product)
                .ToListAsync();
            return Ok(items.Select(MapToDto));
        }

        [HttpGet("{imei}")]
        [Authorize(Roles = "Admin,Staff")]
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
        [Authorize(Roles = "Admin,Staff")]
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
        [Authorize(Roles = "Admin,Staff")]
        public async Task<ActionResult<IEnumerable<InventoryItemDto>>> GetByStatus(string status)
        {
            var items = await _context.Inventoryitems
                .Include(i => i.Variant)
                .ThenInclude(v => v!.Product)
                .Where(i => i.Status == status)
                .ToListAsync();
            return Ok(items.Select(MapToDto));
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<ActionResult<InventoryItemDto>> PostInventoryItem([FromBody] CreateInventoryItemRequestDto dto)
        {
            var item = new Inventoryitem
            {
                Imei = dto.Imei,
                Variantid = dto.Variantid,
                Status = dto.Status ?? "InStock",
                Importedat = dto.Importedat ?? DateTime.Now,
                Warrantystartdate = dto.Warrantystartdate,
                Warrantyenddate = dto.Warrantyenddate,
                Warrantystatus = dto.Warrantystatus
            };

            _context.Inventoryitems.Add(item);
            await _context.SaveChangesAsync();

            var createdItem = await _context.Inventoryitems
                .Include(i => i.Variant)
                .ThenInclude(v => v!.Product)
                .FirstOrDefaultAsync(i => i.Imei == item.Imei);

            return CreatedAtAction(nameof(GetInventoryItem), new { imei = item.Imei }, MapToDto(createdItem!));
        }

        [HttpPut("{imei}")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> PutInventoryItem(string imei, [FromBody] UpdateInventoryItemRequestDto dto)
        {
            var item = await _context.Inventoryitems.FindAsync(imei);
            if (item == null) return NotFound();

            item.Variantid = dto.Variantid;
            item.Status = dto.Status;
            if (dto.Importedat.HasValue)
            {
                item.Importedat = dto.Importedat.Value;
            }
            item.Warrantystartdate = dto.Warrantystartdate;
            item.Warrantyenddate = dto.Warrantyenddate;
            item.Warrantystatus = dto.Warrantystatus;

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
            _context.Inventoryitems.Remove(item);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
