using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.WarrantyPackages;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ECommerceBackend.DTOs.Common;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class WarrantyPackagesController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public WarrantyPackagesController(ECommerceContext context) => _context = context;

        private static WarrantyPackageDto MapToDto(Warrantypackage p) => new WarrantyPackageDto(
            p.Packageid,
            p.Packagename,
            p.Durationmonths,
            p.Price
        );

        [HttpGet]
        public async Task<ActionResult<IEnumerable<WarrantyPackageDto>>> GetWarrantyPackages()
        {
            var packages = await _context.Warrantypackages.ToListAsync();
            return Ok(packages.Select(MapToDto));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<WarrantyPackageDto>> GetWarrantyPackage(int id)
        {
            var package = await _context.Warrantypackages.FindAsync(id);
            if (package == null) return NotFound();
            return Ok(MapToDto(package));
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Manager,Warranty")]
        public async Task<ActionResult<WarrantyPackageDto>> PostWarrantyPackage([FromBody] CreateWarrantyPackageRequestDto dto)
        {
            var exists = await _context.Warrantypackages.AnyAsync(p => p.Packagename == dto.Packagename);
            if (exists)
                return BadRequest(new ApiErrorDto("Tên gói bảo hành đã tồn tại.", null));

            var package = new Warrantypackage
            {
                Packagename = dto.Packagename,
                Durationmonths = dto.Durationmonths,
                Price = dto.Price
            };

            _context.Warrantypackages.Add(package);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetWarrantyPackage), new { id = package.Packageid }, MapToDto(package));
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Manager,Warranty")]
        public async Task<IActionResult> PutWarrantyPackage(int id, [FromBody] UpdateWarrantyPackageRequestDto dto)
        {
            var package = await _context.Warrantypackages.FindAsync(id);
            if (package == null) return NotFound();

            var exists = await _context.Warrantypackages.AnyAsync(p => p.Packagename == dto.Packagename && p.Packageid != id);
            if (exists)
                return BadRequest(new ApiErrorDto("Tên gói bảo hành đã tồn tại.", null));

            package.Packagename = dto.Packagename;
            package.Durationmonths = dto.Durationmonths;
            package.Price = dto.Price;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Warrantypackages.Any(e => e.Packageid == id)) return NotFound();
                throw;
            }

            return Ok(MapToDto(package));
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteWarrantyPackage(int id)
        {
            var package = await _context.Warrantypackages.FindAsync(id);
            if (package == null) return NotFound();

            var isInUse = await _context.Orderitems.AnyAsync(oi => oi.Packageid == id);
            if (isInUse)
                return BadRequest(new ApiErrorDto("Không thể xóa gói bảo hành đang được sử dụng trong đơn hàng.", null));

            _context.Warrantypackages.Remove(package);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
