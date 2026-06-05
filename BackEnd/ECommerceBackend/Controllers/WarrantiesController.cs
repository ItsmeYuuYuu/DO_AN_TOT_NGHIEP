using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Warranties;
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
    public class WarrantiesController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public WarrantiesController(ECommerceContext context) => _context = context;

        private static WarrantyDto MapToDto(Inventoryitem i)
        {
            var orderItem = i.Orderitems?.FirstOrDefault();
            var order = orderItem?.Order;
            var customer = order?.Customer;
            return new WarrantyDto(
                Math.Abs(i.Imei.GetHashCode()), // Dummy numeric ID for backward compatibility
                i.Imei,
                customer?.Customerid,
                i.Warrantystartdate ?? DateTime.MinValue,
                i.Warrantyenddate ?? DateTime.MinValue,
                i.Warrantystatus,
                customer?.Fullname
            );
        }

        [HttpGet]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<ActionResult<IEnumerable<WarrantyDto>>> GetWarranties()
        {
            var items = await _context.Inventoryitems
                .Include(i => i.Orderitems)
                    .ThenInclude(oi => oi.Order)
                        .ThenInclude(o => o.Customer)
                .Where(i => i.Warrantystartdate != null)
                .ToListAsync();
            return Ok(items.Select(MapToDto));
        }

        [HttpGet("{imei}")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<ActionResult<WarrantyDto>> GetWarranty(string imei)
        {
            var item = await _context.Inventoryitems
                .Include(i => i.Orderitems)
                    .ThenInclude(oi => oi.Order)
                        .ThenInclude(o => o.Customer)
                .FirstOrDefaultAsync(i => i.Imei == imei);
            
            if (item == null) return NotFound();
            return Ok(MapToDto(item));
        }

        [HttpGet("customer/{customerId}")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<ActionResult<IEnumerable<WarrantyDto>>> GetWarrantiesByCustomer(int customerId)
        {
            var items = await _context.Inventoryitems
                .Include(i => i.Orderitems)
                    .ThenInclude(oi => oi.Order)
                        .ThenInclude(o => o.Customer)
                .Where(i => i.Warrantystartdate != null && i.Orderitems.Any(oi => oi.Order != null && oi.Order.Customerid == customerId))
                .ToListAsync();
            return Ok(items.Select(MapToDto));
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<ActionResult<WarrantyDto>> PostWarranty([FromBody] CreateWarrantyRequestDto dto)
        {
            if (string.IsNullOrEmpty(dto.Imei))
            {
                return BadRequest(new ApiErrorDto("Mã IMEI là bắt buộc.", null));
            }

            var item = await _context.Inventoryitems.FindAsync(dto.Imei);
            if (item == null)
            {
                return BadRequest(new ApiErrorDto("Không tìm thấy thiết bị với IMEI đã cho trong kho.", null));
            }

            item.Warrantystartdate = dto.Startdate;
            item.Warrantyenddate = dto.Enddate;
            item.Warrantystatus = dto.Status ?? "Active";

            await _context.SaveChangesAsync();

            var updated = await _context.Inventoryitems
                .Include(i => i.Orderitems)
                    .ThenInclude(oi => oi.Order)
                        .ThenInclude(o => o.Customer)
                .FirstAsync(i => i.Imei == item.Imei);

            return CreatedAtAction(nameof(GetWarranty), new { imei = item.Imei }, MapToDto(updated));
        }

        [HttpPut("{imei}")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> PutWarranty(string imei, [FromBody] UpdateWarrantyRequestDto dto)
        {
            var item = await _context.Inventoryitems.FindAsync(imei);
            if (item == null) return NotFound();

            item.Warrantystartdate = dto.Startdate;
            item.Warrantyenddate = dto.Enddate;
            item.Warrantystatus = dto.Status;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Inventoryitems.Any(e => e.Imei == imei)) return NotFound();
                throw;
            }

            var updated = await _context.Inventoryitems
                .Include(i => i.Orderitems)
                    .ThenInclude(oi => oi.Order)
                        .ThenInclude(o => o.Customer)
                .FirstAsync(i => i.Imei == imei);

            return Ok(MapToDto(updated));
        }

        [HttpDelete("{imei}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteWarranty(string imei)
        {
            var item = await _context.Inventoryitems.FindAsync(imei);
            if (item == null) return NotFound();

            item.Warrantystartdate = null;
            item.Warrantyenddate = null;
            item.Warrantystatus = null;

            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
