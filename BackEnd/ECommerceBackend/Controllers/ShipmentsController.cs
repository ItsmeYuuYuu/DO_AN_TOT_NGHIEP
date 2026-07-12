using ECommerceBackend.DTOs.Common;
using ECommerceBackend.DTOs.Shipping;
using ECommerceBackend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ECommerceBackend.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class ShipmentsController : ControllerBase
{
    private static readonly Dictionary<string, string[]> Transitions = new(StringComparer.OrdinalIgnoreCase)
    {
        ["AwaitingPickup"] = ["PickedUp"],
        ["PickedUp"] = ["InTransit"],
        ["InTransit"] = ["OutForDelivery", "DeliveryFailed", "Returning", "DamageClaim", "LostClaim"],
        ["OutForDelivery"] = ["Delivered", "DeliveryFailed", "DamageClaim", "LostClaim"],
        ["DeliveryFailed"] = ["RedeliveryScheduled", "Returning"],
        ["RedeliveryScheduled"] = ["OutForDelivery"],
        ["Returning"] = ["ReturnedToWarehouse"],
        ["DamageClaim"] = ["Returning", "ReturnedToWarehouse"],
        ["LostClaim"] = ["ReturnedToWarehouse"]
    };

    private readonly ECommerceContext _context;

    public ShipmentsController(ECommerceContext context)
    {
        _context = context;
    }

    private int? CurrentUserId()
    {
        var value = User.FindFirst("userid")?.Value;
        return int.TryParse(value, out var id) ? id : null;
    }

    private IQueryable<Shipment> ShipmentQuery() =>
        _context.Shipments
            .Include(item => item.Order)
                .ThenInclude(order => order.Orderitems)
                    .ThenInclude(item => item.Package)
            .Include(item => item.Order)
                .ThenInclude(order => order.Orderitems)
                    .ThenInclude(item => item.ImeiNavigation);

    private static ShipmentDto Map(Shipment shipment) => new(
        shipment.Shipmentid,
        shipment.Orderid,
        shipment.Carrier,
        shipment.Trackingcode,
        shipment.Shippingfee,
        shipment.Status,
        shipment.Estimateddeliveryat,
        shipment.Deliveryattempts,
        shipment.Order.Shippingname,
        shipment.Order.Shippingphone,
        shipment.Order.Shippingaddress,
        shipment.Order.Paymentmethod,
        shipment.Order.Paymentstatus,
        shipment.Order.Finalamount,
        shipment.Createdat,
        shipment.Updatedat,
        shipment.Pickedupat,
        shipment.Deliveredat,
        shipment.Returnedat,
        new List<ShipmentHistoryDto>());

    [HttpGet]
    [Authorize(Roles = "Admin,Manager,Sales,Warehouse")]
    public async Task<ActionResult<IEnumerable<ShipmentDto>>> GetShipments([FromQuery] string? status)
    {
        var query = ShipmentQuery().AsNoTracking();
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(item => item.Status == status.Trim());

        var shipments = await query
            .OrderByDescending(item => item.Updatedat)
            .ToListAsync();
        return Ok(shipments.Select(Map));
    }

    [HttpGet("order/{orderId:int}")]
    public async Task<ActionResult<ShipmentDto>> GetByOrder(int orderId)
    {
        var shipment = await ShipmentQuery().AsNoTracking()
            .FirstOrDefaultAsync(item => item.Orderid == orderId);
        if (shipment == null)
            return NotFound(new ApiErrorDto("Đơn hàng chưa có vận đơn.", null));

        if (User.IsInRole("Customer"))
        {
            var userId = CurrentUserId();
            if (!userId.HasValue || shipment.Order.Userid != userId)
                return Forbid();
        }
        else if (!User.IsInRole("Admin") &&
                 !User.IsInRole("Manager") &&
                 !User.IsInRole("Sales") &&
                 !User.IsInRole("Warehouse"))
        {
            return Forbid();
        }

        return Ok(Map(shipment));
    }

    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = "Admin,Manager,Sales,Warehouse")]
    public async Task<ActionResult<ShipmentDto>> UpdateStatus(int id, UpdateShipmentStatusDto dto)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync();
        var shipment = await ShipmentQuery()
            .FirstOrDefaultAsync(item => item.Shipmentid == id);
        if (shipment == null)
            return NotFound(new ApiErrorDto("Vận đơn không tồn tại.", null));

        var nextStatus = NormalizeStatus(dto.Status);
        if (nextStatus == null ||
            !Transitions.TryGetValue(shipment.Status, out var allowed) ||
            !allowed.Contains(nextStatus, StringComparer.OrdinalIgnoreCase))
        {
            return Conflict(new ApiErrorDto(
                $"Không thể chuyển vận đơn từ {shipment.Status} sang {dto.Status}.",
                null));
        }

        if (User.IsInRole("Warehouse") &&
            nextStatus != "PickedUp" &&
            nextStatus != "ReturnedToWarehouse")
        {
            return Forbid();
        }

        var previous = shipment.Status;
        var now = DateTime.UtcNow;
        shipment.Status = nextStatus;
        shipment.Updatedat = now;
        if (nextStatus == "PickedUp") shipment.Pickedupat = now;
        if (nextStatus == "OutForDelivery") shipment.Deliveryattempts++;
        if (nextStatus == "Delivered")
        {
            shipment.Deliveredat = now;
            await CompleteDeliveryAsync(shipment.Order, now);
        }
        if (nextStatus == "ReturnedToWarehouse")
        {
            shipment.Returnedat = now;
            await ReturnToWarehouseAsync(shipment.Order, now);
        }

        _context.Statuslogs.Add(new Statuslog
        {
            Entitytype = "Shipment",
            Entityid = shipment.Shipmentid,
            Actiontype = nextStatus is "DamageClaim" or "LostClaim" ? "CarrierClaim" : "StatusChanged",
            Userid = CurrentUserId(),
            Fromstatus = previous,
            Tostatus = nextStatus,
            Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim(),
            Metadata = nextStatus is "DamageClaim" or "LostClaim"
                ? System.Text.Json.JsonSerializer.Serialize(new
                {
                    responsibleParty = "Carrier",
                    claimStatus = "Open",
                    compensationStatus = "Pending"
                })
                : null,
            Createdat = now
        });

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        var updated = await ShipmentQuery().AsNoTracking()
            .FirstAsync(item => item.Shipmentid == id);
        return Ok(Map(updated));
    }

    private Task CompleteDeliveryAsync(Order order, DateTime now)
    {
        if (order.Orderstatus != "Shipped")
            throw new InvalidOperationException("Đơn hàng không ở trạng thái đang giao.");

        var remainingAmount = Math.Max(0, order.Finalamount - (order.Paidamount ?? 0));
        if (remainingAmount > 0)
        {
            order.Orderpayments.Add(new Orderpayment
            {
                Provider = order.Paymentmethod == "COD" ? "COD" : "DELIVERY_COLLECTION",
                Paymenttype = order.Paymentmethod == "COD" ? "COD" : "Remaining",
                Amount = remainingAmount,
                Status = "Success",
                Transactionref = $"DELIVERY-{order.Orderid}-{now:yyyyMMddHHmmss}",
                Createdat = now,
                Paidat = now
            });
        }

        order.Orderstatus = "Completed";
        order.Paymentstatus = "Paid";
        order.Paidamount = order.Finalamount;

        foreach (var orderItem in order.Orderitems.Where(item => item.ImeiNavigation != null))
        {
            var inventory = orderItem.ImeiNavigation!;
            var previous = inventory.Status;
            inventory.Status = "Sold";
            inventory.Warrantystartdate = now;
            inventory.Warrantyenddate = now.AddMonths(orderItem.Package?.Durationmonths ?? 12);
            inventory.Warrantystatus = "Active";
            if (previous != "Sold")
            {
                _context.Inventorytransactions.Add(new Inventorytransaction
                {
                    Imei = inventory.Imei,
                    Orderid = order.Orderid,
                    Userid = CurrentUserId(),
                    Transactiontype = "CompleteSale",
                    Fromstatus = previous,
                    Tostatus = "Sold",
                    Note = "Carrier confirmed successful delivery.",
                    Createdat = now
                });
            }
        }
        return Task.CompletedTask;
    }

    private Task ReturnToWarehouseAsync(Order order, DateTime now)
    {
        if (order.Orderstatus != "Shipped")
            throw new InvalidOperationException("Chỉ đơn đang giao mới được hoàn về kho.");

        foreach (var orderItem in order.Orderitems.Where(item => item.ImeiNavigation != null))
        {
            var inventory = orderItem.ImeiNavigation!;
            var previous = inventory.Status;
            inventory.Status = "InStock";
            inventory.Warrantystartdate = null;
            inventory.Warrantyenddate = null;
            inventory.Warrantystatus = null;
            _context.Inventorytransactions.Add(new Inventorytransaction
            {
                Imei = inventory.Imei,
                Orderid = order.Orderid,
                Userid = CurrentUserId(),
                Transactiontype = "DeliveryReturn",
                Fromstatus = previous,
                Tostatus = "InStock",
                Note = "Delivery failed and Warehouse received the returned device.",
                Createdat = now
            });
        }

        var paidAmount = order.Paidamount ?? 0;
        if (paidAmount > 0)
        {
            order.Orderpayments.Add(new Orderpayment
            {
                Provider = order.Paymentmethod ?? "UNKNOWN",
                Paymenttype = "DeliveryReturnRefund",
                Amount = paidAmount,
                Status = "Success",
                Transactionref = $"RETURN-REFUND-{order.Orderid}-{now:yyyyMMddHHmmss}",
                Createdat = now,
                Paidat = now
            });
            order.Paymentstatus = "Refunded";
            order.Paidamount = 0;
        }
        else
        {
            order.Paymentstatus = "Cancelled";
        }

        order.Orderstatus = "Returned";
        order.Cancellationreason = "Giao hàng không thành công, hàng đã hoàn về kho.";
        return Task.CompletedTask;
    }

    private static string? NormalizeStatus(string? status)
    {
        var value = status?.Trim();
        return Transitions.Keys
            .Concat(Transitions.Values.SelectMany(item => item))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .FirstOrDefault(item => item.Equals(value, StringComparison.OrdinalIgnoreCase));
    }
}
