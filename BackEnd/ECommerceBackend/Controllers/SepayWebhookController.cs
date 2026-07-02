using System;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using ECommerceBackend.Models;
using ECommerceBackend.Services.Checkout;
using ECommerceBackend.Services.Email;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SepayWebhookController : ControllerBase
    {
        private readonly ECommerceContext _context;
        private readonly ICheckoutAbuseProtectionService _checkoutAbuseProtection;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;

        public SepayWebhookController(
            ECommerceContext context,
            ICheckoutAbuseProtectionService checkoutAbuseProtection,
            IEmailService emailService,
            IConfiguration configuration)
        {
            _context = context;
            _checkoutAbuseProtection = checkoutAbuseProtection;
            _emailService = emailService;
            _configuration = configuration;
        }

        public class SepayWebhookDto
        {
            public long Id { get; set; }
            public string? Gateway { get; set; }
            public string? TransactionDate { get; set; }
            public string? AccountNumber { get; set; }
            public string? Code { get; set; }
            public string? Content { get; set; }
            public string? TransferType { get; set; }
            public decimal TransferAmount { get; set; }
            public decimal AccumulatedBalance { get; set; }
            public string? SubAccount { get; set; }
            public string? ReferenceCode { get; set; }
            public string? Signature { get; set; }
        }

        [HttpPost]
        public async Task<IActionResult> ProcessWebhook([FromBody] SepayWebhookDto payload)
        {
            // 1. Verify ApiKey if configured in appsettings
            var configuredKey = _configuration["Sepay:ApiKey"];
            if (!string.IsNullOrEmpty(configuredKey))
            {
                var authHeader = Request.Headers["Authorization"].ToString();
                if (string.IsNullOrEmpty(authHeader) || !authHeader.Contains(configuredKey))
                {
                    return Unauthorized(new { message = "Unauthorized webhook request." });
                }
            }

            // 2. We only process incoming transfers ("in")
            if (payload.TransferType != null && payload.TransferType.Trim().ToLower() != "in")
            {
                return Ok(new { success = true, message = "Skipped outbound transaction." });
            }

            // 3. Extract Order ID from Code or Content using CDT prefix
            string? codeToParse = !string.IsNullOrEmpty(payload.Code) ? payload.Code : payload.Content;
            if (string.IsNullOrEmpty(codeToParse))
            {
                return BadRequest(new { message = "No transaction code or description found." });
            }

            var match = Regex.Match(codeToParse, @"CDT(\d+)", RegexOptions.IgnoreCase);
            if (!match.Success)
            {
                return BadRequest(new { message = "Could not parse CDT Order ID from transaction content." });
            }

            int orderId = int.Parse(match.Groups[1].Value);

            // 4. Retrieve order in a database transaction
            using var dbTransaction = await _context.Database.BeginTransactionAsync();
            var order = await _context.Orders
                .Include(item => item.Orderpayments)
                .FirstOrDefaultAsync(item => item.Orderid == orderId);

            if (order == null)
            {
                return NotFound(new { message = $"Order #{orderId} not found." });
            }

            if (order.Orderstatus == "Cancelled")
            {
                return Conflict(new { message = "Order is already cancelled." });
            }

            if (order.Paymentstatus == "Paid")
            {
                return Ok(new { success = true, message = "Order is already fully paid." });
            }

            // 5. Update Paidamount and add Payment success record
            var remaining = Math.Max(0, order.Finalamount - (order.Paidamount ?? 0));
            var acceptedAmount = Math.Min(payload.TransferAmount, remaining);
            if (acceptedAmount <= 0)
            {
                return Ok(new { success = true, message = "No remaining payment due." });
            }

            var now = DateTime.UtcNow;

            // Try to use a pending payment record if exists, otherwise create a new one
            var payment = order.Orderpayments
                .Where(item => item.Status == "Pending")
                .OrderByDescending(item => item.Createdat)
                .FirstOrDefault();

            if (payment == null)
            {
                payment = new Orderpayment
                {
                    Orderid = order.Orderid,
                    Provider = "SEPAY",
                    Paymenttype = order.Paymentstatus == "DepositPaid" ? "Remaining" : "Confirmation",
                    Createdat = now
                };
                order.Orderpayments.Add(payment);
            }
            else
            {
                payment.Provider = "SEPAY";
            }

            payment.Amount = acceptedAmount;
            payment.Status = "Success";
            payment.Transactionref = string.IsNullOrWhiteSpace(payload.ReferenceCode)
                ? $"SEPAY-{payload.Id}"
                : payload.ReferenceCode.Trim();
            payment.Paidat = now;

            order.Paidamount = (order.Paidamount ?? 0) + acceptedAmount;
            var remainingAfterPayment = Math.Max(0, order.Finalamount - (order.Paidamount ?? 0));
            order.Paymentstatus = remainingAfterPayment <= 0
                ? "Paid"
                : order.Depositpercentage.HasValue && order.Paidamount >= (order.Requiredpayment ?? 0)
                    ? "DepositPaid"
                    : "PartialPayment";
            order.Reservationexpiresat = null;

            if (!string.IsNullOrWhiteSpace(order.Shippingphone))
            {
                await _checkoutAbuseProtection.ReleaseGuestPendingAsync(order.Guesttoken, order.Shippingphone);
            }

            await _context.SaveChangesAsync();
            await dbTransaction.CommitAsync();

            // Send payment confirmation email asynchronously
            await _emailService.SendPaymentUpdatedAsync(order, HttpContext.RequestAborted);

            return Ok(new { success = true, message = "Payment confirmed successfully.", orderId = order.Orderid, newStatus = order.Paymentstatus });
        }
    }
}
