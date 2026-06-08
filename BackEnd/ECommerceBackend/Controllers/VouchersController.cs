using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.Vouchers;
using Microsoft.AspNetCore.Authorization;
using ECommerceBackend.DTOs.Common;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class VouchersController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public VouchersController(ECommerceContext context) => _context = context;

        private static VoucherDto MapToDto(Voucher v) => new VoucherDto(
            v.Vouchercode,
            v.Discountamount,
            v.Discountpercentage,
            v.Validfrom,
            v.Validto,
            v.Isactive
        );

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<IEnumerable<VoucherDto>>> GetVouchers()
        {
            var vouchers = await _context.Vouchers.ToListAsync();
            return Ok(vouchers.Select(MapToDto));
        }

        // GET: api/Vouchers/active — public endpoint for Promotions page
        [HttpGet("active")]
        public async Task<ActionResult<IEnumerable<VoucherDto>>> GetActiveVouchers()
        {
            var now = DateTime.Now;
            var vouchers = await _context.Vouchers
                .Where(v => v.Isactive == true
                    && (v.Validfrom == null || v.Validfrom <= now)
                    && (v.Validto == null || v.Validto >= now))
                .ToListAsync();
            return Ok(vouchers.Select(MapToDto));
        }

        [HttpGet("{code}")]
        [Authorize]
        public async Task<ActionResult<VoucherDto>> GetVoucher(string code)
        {
            var voucher = await _context.Vouchers.FindAsync(code);
            if (voucher == null) return NotFound();
            return Ok(MapToDto(voucher));
        }

        [HttpGet("validate/{code}")]
        [Authorize]
        public async Task<IActionResult> ValidateVoucher(string code)
        {
            var voucher = await _context.Vouchers.FindAsync(code);
            if (voucher == null) return NotFound(new ApiErrorDto("Voucher không tồn tại."));
            if (voucher.Isactive == false) return BadRequest(new ApiErrorDto("Voucher đã hết hiệu lực."));
            var now = DateTime.Now;
            if (voucher.Validfrom.HasValue && now < voucher.Validfrom) return BadRequest(new ApiErrorDto("Voucher chưa có hiệu lực."));
            if (voucher.Validto.HasValue && now > voucher.Validto) return BadRequest(new ApiErrorDto("Voucher đã hết hạn."));
            
            return Ok(MapToDto(voucher));
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<VoucherDto>> PostVoucher([FromBody] CreateVoucherRequestDto dto)
        {
            var voucher = new Voucher
            {
                Vouchercode = dto.Vouchercode,
                Discountamount = dto.Discountamount,
                Discountpercentage = dto.Discountpercentage,
                Validfrom = dto.Validfrom,
                Validto = dto.Validto,
                Isactive = dto.Isactive ?? true
            };

            _context.Vouchers.Add(voucher);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetVoucher), new { code = voucher.Vouchercode }, MapToDto(voucher));
        }

        [HttpPut("{code}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> PutVoucher(string code, [FromBody] UpdateVoucherRequestDto dto)
        {
            var voucher = await _context.Vouchers.FindAsync(code);
            if (voucher == null) return NotFound();

            voucher.Discountamount = dto.Discountamount;
            voucher.Discountpercentage = dto.Discountpercentage;
            voucher.Validfrom = dto.Validfrom;
            voucher.Validto = dto.Validto;
            if (dto.Isactive.HasValue)
            {
                voucher.Isactive = dto.Isactive.Value;
            }

            try 
            { 
                await _context.SaveChangesAsync(); 
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Vouchers.Any(e => e.Vouchercode == code)) return NotFound();
                throw;
            }

            return Ok(MapToDto(voucher));
        }

        [HttpDelete("{code}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> DeleteVoucher(string code)
        {
            var voucher = await _context.Vouchers.FindAsync(code);
            if (voucher == null) return NotFound();

            _context.Vouchers.Remove(voucher);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
