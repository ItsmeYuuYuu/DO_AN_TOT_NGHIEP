using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class VouchersController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public VouchersController(ECommerceContext context) => _context = context;

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Voucher>>> GetVouchers()
            => await _context.Vouchers.ToListAsync();

        [HttpGet("{code}")]
        public async Task<ActionResult<Voucher>> GetVoucher(string code)
        {
            var voucher = await _context.Vouchers.FindAsync(code);
            if (voucher == null) return NotFound();
            return voucher;
        }

        [HttpGet("validate/{code}")]
        public async Task<IActionResult> ValidateVoucher(string code)
        {
            var voucher = await _context.Vouchers.FindAsync(code);
            if (voucher == null) return NotFound(new { message = "Voucher không tồn tại." });
            if (voucher.Isactive == false) return BadRequest(new { message = "Voucher đã hết hiệu lực." });
            var now = DateTime.Now;
            if (voucher.Validfrom.HasValue && now < voucher.Validfrom) return BadRequest(new { message = "Voucher chưa có hiệu lực." });
            if (voucher.Validto.HasValue && now > voucher.Validto) return BadRequest(new { message = "Voucher đã hết hạn." });
            return Ok(voucher);
        }

        [HttpPost]
        public async Task<ActionResult<Voucher>> PostVoucher(Voucher voucher)
        {
            _context.Vouchers.Add(voucher);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetVoucher), new { code = voucher.Vouchercode }, voucher);
        }

        [HttpPut("{code}")]
        public async Task<IActionResult> PutVoucher(string code, Voucher voucher)
        {
            if (code != voucher.Vouchercode) return BadRequest();
            _context.Entry(voucher).State = EntityState.Modified;
            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Vouchers.Any(e => e.Vouchercode == code)) return NotFound();
                throw;
            }
            return NoContent();
        }

        [HttpDelete("{code}")]
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
