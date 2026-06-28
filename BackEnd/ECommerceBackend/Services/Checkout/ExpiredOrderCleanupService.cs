using ECommerceBackend.Models;
using Microsoft.EntityFrameworkCore;

namespace ECommerceBackend.Services.Checkout;

public class ExpiredOrderCleanupService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ExpiredOrderCleanupService> _logger;
    private readonly IHostEnvironment _environment;

    public ExpiredOrderCleanupService(
        IServiceScopeFactory scopeFactory,
        ILogger<ExpiredOrderCleanupService> logger,
        IHostEnvironment environment)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _environment = environment;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (_environment.IsEnvironment("Testing")) return;

        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
        await CleanupAsync(stoppingToken);

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await CleanupAsync(stoppingToken);
        }
    }

    internal async Task CleanupAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ECommerceContext>();
            var abuseProtection = scope.ServiceProvider.GetRequiredService<ICheckoutAbuseProtectionService>();
            var now = DateTime.UtcNow;

            var expiredOrders = await context.Orders
                .Include(order => order.Orderitems)
                .Include(order => order.Orderpayments)
                .Where(order =>
                    order.Orderstatus == "Pending" &&
                    order.Paymentmethod != "COD" &&
                    order.Reservationexpiresat != null &&
                    order.Reservationexpiresat <= now &&
                    order.Paymentstatus != "DepositPaid" &&
                    order.Paymentstatus != "Paid")
                .ToListAsync(cancellationToken);

            foreach (var order in expiredOrders)
            {
                var imeis = order.Orderitems
                    .Where(item => item.Imei != null)
                    .Select(item => item.Imei!)
                    .ToList();

                if (imeis.Count > 0)
                {
                    var inventoryItems = await context.Inventoryitems
                        .Where(item => imeis.Contains(item.Imei))
                        .ToListAsync(cancellationToken);
                    foreach (var inventoryItem in inventoryItems)
                    {
                        if (inventoryItem.Status == "Reserved")
                        {
                            var previousStatus = inventoryItem.Status;
                            inventoryItem.Status = "InStock";
                            context.Inventorytransactions.Add(new Inventorytransaction
                            {
                                Imei = inventoryItem.Imei,
                                Orderid = order.Orderid,
                                Transactiontype = "Restock",
                                Fromstatus = previousStatus,
                                Tostatus = "InStock",
                                Note = "Payment reservation expired.",
                                Createdat = now
                            });
                        }
                    }
                }

                foreach (var payment in order.Orderpayments.Where(payment => payment.Status == "Pending"))
                {
                    payment.Status = "Expired";
                }

                order.Orderstatus = "Cancelled";
                order.Paymentstatus = "Expired";
                order.Cancellationreason = "Quá 15 phút chưa hoàn tất thanh toán.";

                if (!string.IsNullOrWhiteSpace(order.Shippingphone))
                {
                    await abuseProtection.ReleaseGuestPendingAsync(order.Guesttoken, order.Shippingphone);
                }
            }

            if (expiredOrders.Count > 0)
            {
                await context.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Cancelled {Count} expired unpaid orders.", expiredOrders.Count);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to clean up expired unpaid orders.");
        }
    }
}
