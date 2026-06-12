using ECommerceBackend.DTOs.Inventory;
using ECommerceBackend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ECommerceBackend.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Admin,Manager,Warehouse")]
public class InventoryTransactionsController : ControllerBase
{
    private readonly ECommerceContext _context;

    public InventoryTransactionsController(ECommerceContext context)
    {
        _context = context;
    }

    private static InventoryTransactionDto Map(Inventorytransaction item) => new(
        item.Transactionid,
        item.Imei,
        item.Orderid,
        item.Userid,
        item.User?.Fullname,
        item.Transactiontype,
        item.Fromstatus,
        item.Tostatus,
        item.Note,
        item.Createdat);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<InventoryTransactionDto>>> GetAll()
    {
        var items = await _context.Inventorytransactions
            .AsNoTracking()
            .Include(item => item.User)
            .OrderByDescending(item => item.Createdat)
            .Take(500)
            .ToListAsync();
        return Ok(items.Select(Map));
    }

    [HttpGet("order/{orderId}")]
    public async Task<ActionResult<IEnumerable<InventoryTransactionDto>>> GetByOrder(int orderId)
    {
        var items = await _context.Inventorytransactions
            .AsNoTracking()
            .Include(item => item.User)
            .Where(item => item.Orderid == orderId)
            .OrderBy(item => item.Createdat)
            .ToListAsync();
        return Ok(items.Select(Map));
    }

    [HttpGet("imei/{imei}")]
    public async Task<ActionResult<IEnumerable<InventoryTransactionDto>>> GetByImei(string imei)
    {
        var items = await _context.Inventorytransactions
            .AsNoTracking()
            .Include(item => item.User)
            .Where(item => item.Imei == imei)
            .OrderBy(item => item.Createdat)
            .ToListAsync();
        return Ok(items.Select(Map));
    }
}
