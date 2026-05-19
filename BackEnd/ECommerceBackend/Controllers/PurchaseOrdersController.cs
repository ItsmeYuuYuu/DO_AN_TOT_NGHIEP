using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ECommerceBackend.Models;
using ECommerceBackend.DTOs.PurchaseOrders;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PurchaseOrdersController : ControllerBase
    {
        private readonly ECommerceContext _context;

        public PurchaseOrdersController(ECommerceContext context) => _context = context;

        private static PurchaseOrderDetailDto MapDetailToDto(Purchaseorderdetail d) => new PurchaseOrderDetailDto(
            d.Podetailid,
            d.Poid,
            d.Variantid,
            d.Quantity,
            d.Importprice,
            d.Variant?.Sku,
            d.Variant?.Product?.Productname
        );

        private static PurchaseOrderDto MapToDto(Purchaseorder p) => new PurchaseOrderDto(
            p.Poid,
            p.Supplierid,
            p.Userid,
            p.Importdate,
            p.Totalamount,
            p.Taxfee,
            p.Shippingfee,
            p.Status,
            p.Supplier?.Suppliername,
            p.User?.Fullname,
            p.Purchaseorderdetails != null 
                ? p.Purchaseorderdetails.Select(MapDetailToDto).ToList() 
                : new List<PurchaseOrderDetailDto>()
        );

        [HttpGet]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<ActionResult<IEnumerable<PurchaseOrderDto>>> GetPurchaseOrders()
        {
            var pos = await _context.Purchaseorders
                .Include(p => p.Supplier)
                .Include(p => p.User)
                .Include(p => p.Purchaseorderdetails)
                .ThenInclude(d => d.Variant)
                .ThenInclude(v => v!.Product)
                .ToListAsync();
            return Ok(pos.Select(MapToDto));
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<ActionResult<PurchaseOrderDto>> GetPurchaseOrder(int id)
        {
            var po = await _context.Purchaseorders
                .Include(p => p.Supplier)
                .Include(p => p.User)
                .Include(p => p.Purchaseorderdetails)
                .ThenInclude(d => d.Variant)
                .ThenInclude(v => v!.Product)
                .FirstOrDefaultAsync(p => p.Poid == id);
            if (po == null) return NotFound();
            return Ok(MapToDto(po));
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<ActionResult<PurchaseOrderDto>> PostPurchaseOrder([FromBody] CreatePurchaseOrderRequestDto dto)
        {
            var po = new Purchaseorder
            {
                Supplierid = dto.Supplierid,
                Userid = dto.Userid,
                Importdate = dto.Importdate ?? DateTime.UtcNow,
                Taxfee = dto.Taxfee ?? 0,
                Shippingfee = dto.Shippingfee ?? 0,
                Status = dto.Status ?? "Pending",
                Totalamount = 0
            };

            decimal total = 0;
            if (dto.Details != null && dto.Details.Any())
            {
                foreach (var detailDto in dto.Details)
                {
                    var detail = new Purchaseorderdetail
                    {
                        Variantid = detailDto.Variantid,
                        Quantity = detailDto.Quantity,
                        Importprice = detailDto.Importprice
                    };
                    po.Purchaseorderdetails.Add(detail);
                    total += detailDto.Importprice * detailDto.Quantity;
                }
            }

            po.Totalamount = total + po.Taxfee.Value + po.Shippingfee.Value;

            _context.Purchaseorders.Add(po);
            await _context.SaveChangesAsync();

            var createdPo = await _context.Purchaseorders
                .Include(p => p.Supplier)
                .Include(p => p.User)
                .Include(p => p.Purchaseorderdetails)
                .ThenInclude(d => d.Variant)
                .ThenInclude(v => v!.Product)
                .FirstOrDefaultAsync(p => p.Poid == po.Poid);

            return CreatedAtAction(nameof(GetPurchaseOrder), new { id = po.Poid }, MapToDto(createdPo!));
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> PutPurchaseOrder(int id, [FromBody] UpdatePurchaseOrderRequestDto dto)
        {
            var po = await _context.Purchaseorders
                .Include(p => p.Purchaseorderdetails)
                .FirstOrDefaultAsync(p => p.Poid == id);
            if (po == null) return NotFound();

            po.Supplierid = dto.Supplierid;
            po.Userid = dto.Userid;
            if (dto.Importdate.HasValue)
            {
                po.Importdate = dto.Importdate.Value;
            }
            po.Taxfee = dto.Taxfee ?? po.Taxfee;
            po.Shippingfee = dto.Shippingfee ?? po.Shippingfee;
            po.Status = dto.Status;

            // Recalculate total amount
            decimal detailTotal = po.Purchaseorderdetails.Sum(d => d.Importprice * d.Quantity);
            po.Totalamount = detailTotal + (po.Taxfee ?? 0) + (po.Shippingfee ?? 0);

            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Purchaseorders.Any(e => e.Poid == id)) return NotFound();
                throw;
            }

            var updatedPo = await _context.Purchaseorders
                .Include(p => p.Supplier)
                .Include(p => p.User)
                .Include(p => p.Purchaseorderdetails)
                .ThenInclude(d => d.Variant)
                .ThenInclude(v => v!.Product)
                .FirstOrDefaultAsync(p => p.Poid == id);

            return Ok(MapToDto(updatedPo!));
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeletePurchaseOrder(int id)
        {
            var po = await _context.Purchaseorders.FindAsync(id);
            if (po == null) return NotFound();
            _context.Purchaseorders.Remove(po);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
