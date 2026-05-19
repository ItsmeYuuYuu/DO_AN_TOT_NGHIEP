using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Warranties;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class WarrantiesController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public WarrantiesController(ECommerceContext context) => _context = context;

        private static WarrantyDto MapToDto(Warranty w) => new WarrantyDto(
            w.Warrantyid,
            w.Imei,
            w.Customerid,
            w.Startdate,
            w.Enddate,
            w.Status,
            w.Customer?.Fullname
        );

        [HttpGet]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<ActionResult<IEnumerable<WarrantyDto>>> GetWarranties()
        {
            var warranties = await _context.Warranties.Include(w => w.Customer).ToListAsync();
            return Ok(warranties.Select(MapToDto));
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<ActionResult<WarrantyDto>> GetWarranty(int id)
        {
            var w = await _context.Warranties.Include(w => w.Customer).FirstOrDefaultAsync(w => w.Warrantyid == id);
            if (w == null) return NotFound();
            return Ok(MapToDto(w));
        }

        [HttpGet("customer/{customerId}")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<ActionResult<IEnumerable<WarrantyDto>>> GetWarrantiesByCustomer(int customerId)
        {
            var warranties = await _context.Warranties.Include(w => w.Customer).Where(w => w.Customerid == customerId).ToListAsync();
            return Ok(warranties.Select(MapToDto));
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<ActionResult<WarrantyDto>> PostWarranty([FromBody] CreateWarrantyRequestDto dto)
        {
            var warranty = new Warranty
            {
                Imei = dto.Imei,
                Customerid = dto.Customerid,
                Startdate = dto.Startdate,
                Enddate = dto.Enddate,
                Status = dto.Status ?? "Active"
            };

            _context.Warranties.Add(warranty);
            await _context.SaveChangesAsync();

            var createdWarranty = await _context.Warranties.Include(w => w.Customer).FirstOrDefaultAsync(w => w.Warrantyid == warranty.Warrantyid);
            return CreatedAtAction(nameof(GetWarranty), new { id = warranty.Warrantyid }, MapToDto(createdWarranty!));
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> PutWarranty(int id, [FromBody] UpdateWarrantyRequestDto dto)
        {
            var warranty = await _context.Warranties.FindAsync(id);
            if (warranty == null) return NotFound();

            warranty.Imei = dto.Imei;
            warranty.Customerid = dto.Customerid;
            warranty.Startdate = dto.Startdate;
            warranty.Enddate = dto.Enddate;
            warranty.Status = dto.Status;

            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Warranties.Any(e => e.Warrantyid == id)) return NotFound();
                throw;
            }

            var updatedWarranty = await _context.Warranties.Include(w => w.Customer).FirstOrDefaultAsync(w => w.Warrantyid == id);
            return Ok(MapToDto(updatedWarranty!));
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteWarranty(int id)
        {
            var warranty = await _context.Warranties.FindAsync(id);
            if (warranty == null) return NotFound();
            _context.Warranties.Remove(warranty);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
