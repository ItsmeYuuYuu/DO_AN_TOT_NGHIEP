using ECommerceBackend.DTOs.Common;
using ECommerceBackend.DTOs.Orders;
using ECommerceBackend.Models;
using ECommerceBackend.Services.Checkout;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ECommerceBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OrdersController : ControllerBase
    {
        private const string StatusPending = "Pending";
        private const string StatusProcessing = "Processing";
        private const string StatusShipped = "Shipped";
        private const string StatusCompleted = "Completed";
        private const string StatusCancelled = "Cancelled";

        private readonly ECommerceContext _context;
        private readonly ICheckoutAbuseProtectionService _checkoutAbuseProtection;

        public OrdersController(
            ECommerceContext context,
            ICheckoutAbuseProtectionService checkoutAbuseProtection)
        {
            _context = context;
            _checkoutAbuseProtection = checkoutAbuseProtection;
        }

        private static OrderListItemDto MapToDto(Order o)
        {
            var customer = o.Customer != null
                ? new CustomerLiteDto(o.Customer.Customerid, o.Customer.Fullname, o.Customer.Phone, o.Customer.Email)
                : null;
            var items = o.Orderitems.Select(i => new OrderItemDto(
                i.Orderitemid,
                i.Orderid,
                i.Imei,
                i.Sellingprice,
                i.Warrantyprice,
                i.Packageid,
                i.Package?.Packagename,
                i.ImeiNavigation?.Variant?.Product?.Productname,
                i.ImeiNavigation?.Variant?.Sku
            )).ToList();
            var payments = o.Orderpayments
                .OrderByDescending(payment => payment.Createdat)
                .Select(payment => new OrderPaymentDto(
                    payment.Paymentid,
                    payment.Provider,
                    payment.Paymenttype,
                    payment.Amount,
                    payment.Status,
                    payment.Transactionref,
                    payment.Createdat,
                    payment.Paidat))
                .ToList();

            return new OrderListItemDto(
                o.Orderid,
                o.Customerid,
                o.Orderdate,
                o.Orderstatus,
                o.Totalamount,
                o.Discountamount,
                o.Finalamount,
                o.Paymentmethod,
                o.Checkouttype,
                o.Paymentstatus,
                o.Requiredpayment,
                o.Paidamount,
                o.Depositpercentage,
                o.Shippingname,
                o.Shippingphone,
                o.Shippingemail,
                o.Shippingaddress,
                o.Customernote,
                o.Reservationexpiresat,
                o.Paymenttoken,
                o.Cancellationreason,
                customer,
                items,
                payments
            );
        }

        private static OrderDetailDto MapToDetailDto(Order o)
        {
            var mapped = MapToDto(o);
            return new OrderDetailDto(
                mapped.Orderid,
                mapped.Customerid,
                mapped.Orderdate,
                mapped.Orderstatus,
                mapped.Totalamount,
                mapped.Discountamount,
                mapped.Finalamount,
                mapped.Paymentmethod,
                mapped.Checkouttype,
                mapped.Paymentstatus,
                mapped.Requiredpayment,
                mapped.Paidamount,
                mapped.Depositpercentage,
                mapped.Shippingname,
                mapped.Shippingphone,
                mapped.Shippingemail,
                mapped.Shippingaddress,
                mapped.Customernote,
                mapped.Reservationexpiresat,
                mapped.Paymenttoken,
                mapped.Cancellationreason,
                mapped.Customer,
                mapped.Orderitems,
                mapped.Orderpayments
            );
        }

        private int? GetClaimUserId()
        {
            var value = User.FindFirst("userid")?.Value;
            return int.TryParse(value, out var userId) ? userId : null;
        }

        private static string NormalizePaymentMethod(string? method)
        {
            var value = (method ?? string.Empty).Trim().ToUpperInvariant();
            return value switch
            {
                "TIENMAT" or "TIEN MAT" or "TIEN_MAT" or "CASH" => "COD",
                "CHUYENKHOAN" or "CHUYEN KHOAN" or "BANKTRANSFER" or "BANK_TRANSFER" => "BANK",
                "NGANHANG" or "NGAN HANG" => "BANK",
                "MOMO" => "MOMO",
                "VNPAY" => "VNPAY",
                "BANK" => "BANK",
                "COD" => "COD",
                _ => value
            };
        }

        private static bool IsStaffOrAdmin(System.Security.Claims.ClaimsPrincipal user) =>
            user.IsInRole("Admin") ||
            user.IsInRole("Manager") ||
            user.IsInRole("Sales") ||
            user.IsInRole("Staff");

        private static bool IsValidPaymentMethod(string paymentMethod) =>
            paymentMethod is "COD" or "MOMO" or "VNPAY" or "BANK";

        private static string NormalizePaymentOption(string? option)
        {
            var value = (option ?? string.Empty).Trim().ToUpperInvariant();
            return value switch
            {
                "DEPOSIT" or "DEPOSIT30" or "COC" or "COC30" or "30" => "Deposit30",
                "FULL" or "FULLPAYMENT" or "100" => "Full",
                _ => string.Empty
            };
        }

        private async Task<Customer> FindOrCreateCustomerAsync(
            string fullName,
            string phone,
            string? email,
            string shippingAddress)
        {
            Customer? customer = null;
            if (!string.IsNullOrWhiteSpace(phone))
            {
                customer = await _context.Customers.FirstOrDefaultAsync(c => c.Phone == phone);
            }

            if (customer == null && !string.IsNullOrWhiteSpace(email))
            {
                customer = await _context.Customers.FirstOrDefaultAsync(c => c.Email == email);
            }

            if (customer == null)
            {
                customer = new Customer
                {
                    Fullname = fullName,
                    Phone = phone,
                    Email = string.IsNullOrWhiteSpace(email) ? null : email,
                    Address = shippingAddress,
                    Createdat = DateTime.UtcNow
                };
                _context.Customers.Add(customer);
                await _context.SaveChangesAsync();
            }
            else
            {
                customer.Fullname = fullName;
                customer.Email = string.IsNullOrWhiteSpace(email) ? customer.Email : email;
                customer.Address = shippingAddress;
            }

            return customer;
        }

        private static Dictionary<string, string[]> ValidTransitions() => new()
        {
            { StatusPending, new[] { StatusProcessing, StatusCancelled } },
            { StatusProcessing, new[] { StatusShipped, StatusCancelled } },
            { StatusShipped, new[] { StatusCompleted, StatusCancelled } }
        };

        private static bool IsPaymentReadyForProcessing(Order order)
        {
            if (order.Paymentmethod == "COD")
            {
                return order.Checkouttype == "Registered" && order.Paymentstatus == "CODPending";
            }

            return order.Paymentstatus is "DepositPaid" or "Paid";
        }

        private static decimal RemainingAmount(Order order) =>
            Math.Max(0, order.Finalamount - (order.Paidamount ?? 0));

        private async Task<PaymentActionResultDto> RecordSuccessfulPaymentAsync(
            Order order,
            decimal amount,
            string? transactionRef,
            string source)
        {
            var remaining = RemainingAmount(order);
            var acceptedAmount = Math.Min(amount, remaining);
            var now = DateTime.UtcNow;
            var payment = order.Orderpayments
                .Where(item => item.Status == "Pending")
                .OrderByDescending(item => item.Createdat)
                .FirstOrDefault();

            if (payment == null)
            {
                payment = new Orderpayment
                {
                    Orderid = order.Orderid,
                    Provider = order.Paymentmethod ?? "UNKNOWN",
                    Paymenttype = order.Paymentstatus == "DepositPaid" ? "Remaining" : "Confirmation",
                    Createdat = now
                };
                order.Orderpayments.Add(payment);
            }

            payment.Amount = acceptedAmount;
            payment.Status = "Success";
            payment.Transactionref = string.IsNullOrWhiteSpace(transactionRef)
                ? $"{source}-{order.Orderid}-{now:yyyyMMddHHmmss}"
                : transactionRef.Trim();
            payment.Paidat = now;

            order.Paidamount = (order.Paidamount ?? 0) + acceptedAmount;
            var remainingAfterPayment = RemainingAmount(order);
            order.Paymentstatus = remainingAfterPayment <= 0
                ? "Paid"
                : order.Depositpercentage.HasValue && order.Paidamount >= order.Requiredpayment
                    ? "DepositPaid"
                    : "PartialPayment";
            order.Reservationexpiresat = null;

            if (!string.IsNullOrWhiteSpace(order.Shippingphone))
            {
                await _checkoutAbuseProtection.ReleaseGuestPendingAsync(order.Guesttoken, order.Shippingphone);
            }

            return new PaymentActionResultDto(
                order.Orderid,
                order.Paymentstatus,
                order.Paidamount ?? 0,
                remainingAfterPayment,
                payment.Transactionref);
        }

        private async Task ExpireOrderAsync(Order order)
        {
            await ApplyInventoryForStatusAsync(order, StatusCancelled);
            foreach (var payment in order.Orderpayments.Where(item => item.Status == "Pending"))
            {
                payment.Status = "Expired";
            }
            order.Orderstatus = StatusCancelled;
            order.Paymentstatus = "Expired";
            order.Cancellationreason = "Qua 15 phut chua hoan tat thanh toan.";

            if (!string.IsNullOrWhiteSpace(order.Shippingphone))
            {
                await _checkoutAbuseProtection.ReleaseGuestPendingAsync(order.Guesttoken, order.Shippingphone);
            }
        }

        private async Task ApplyInventoryForStatusAsync(Order order, string newStatus)
        {
            var imeis = order.Orderitems
                .Where(item => item.Imei != null)
                .Select(item => item.Imei!)
                .ToList();
            if (imeis.Count == 0) return;

            var inventoryItems = await _context.Inventoryitems
                .Where(item => imeis.Contains(item.Imei))
                .ToListAsync();

            if (newStatus == StatusCancelled)
            {
                foreach (var inv in inventoryItems)
                {
                    var previousStatus = inv.Status;
                    inv.Status = "InStock";
                    inv.Warrantystartdate = null;
                    inv.Warrantyenddate = null;
                    inv.Warrantystatus = null;
                    if (previousStatus != "InStock")
                    {
                        _context.Inventorytransactions.Add(new Inventorytransaction
                        {
                            Imei = inv.Imei,
                            Orderid = order.Orderid,
                            Userid = GetClaimUserId(),
                            Transactiontype = "Restock",
                            Fromstatus = previousStatus,
                            Tostatus = "InStock",
                            Note = "Order cancelled or payment reservation expired.",
                            Createdat = DateTime.UtcNow
                        });
                    }
                }
                return;
            }

            if (newStatus == StatusCompleted)
            {
                var now = DateTime.UtcNow;
                foreach (var inv in inventoryItems)
                {
                    var orderItem = order.Orderitems.FirstOrDefault(item => item.Imei == inv.Imei);
                    var previousStatus = inv.Status;
                    inv.Status = "Sold";
                    inv.Warrantystartdate = now;
                    inv.Warrantyenddate = now.AddMonths(orderItem?.Package?.Durationmonths ?? 12);
                    inv.Warrantystatus = "Active";
                    if (previousStatus != "Sold")
                    {
                        _context.Inventorytransactions.Add(new Inventorytransaction
                        {
                            Imei = inv.Imei,
                            Orderid = order.Orderid,
                            Userid = GetClaimUserId(),
                            Transactiontype = "CompleteSale",
                            Fromstatus = previousStatus,
                            Tostatus = "Sold",
                            Note = "Order completed and warranty activated.",
                            Createdat = now
                        });
                    }
                }
            }
        }

        [HttpGet]
        [Authorize(Roles = "Admin,Manager,Sales,Warranty,Consultant,Staff")]
        public async Task<ActionResult<IEnumerable<OrderListItemDto>>> GetOrders()
        {
            var orders = await _context.Orders
                .Include(o => o.Customer)
                .Include(o => o.Orderitems)
                    .ThenInclude(oi => oi.Package)
                .Include(o => o.Orderitems)
                    .ThenInclude(oi => oi.ImeiNavigation)
                        .ThenInclude(inv => inv!.Variant)
                            .ThenInclude(v => v!.Product)
                .Include(o => o.Orderpayments)
                .OrderByDescending(o => o.Orderdate)
                .ToListAsync();

            return Ok(orders.Select(MapToDto));
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Manager,Sales,Warranty,Consultant,Staff")]
        public async Task<ActionResult<OrderDetailDto>> GetOrder(int id)
        {
            var order = await _context.Orders
                .Include(o => o.Customer)
                .Include(o => o.Orderitems)
                    .ThenInclude(oi => oi.Package)
                .Include(o => o.Orderitems)
                    .ThenInclude(oi => oi.ImeiNavigation)
                        .ThenInclude(inv => inv!.Variant)
                            .ThenInclude(v => v!.Product)
                .Include(o => o.Orderpayments)
                .FirstOrDefaultAsync(o => o.Orderid == id);

            if (order == null) return NotFound();
            return Ok(MapToDetailDto(order));
        }

        [HttpGet("customer/{customerId}")]
        [Authorize(Roles = "Admin,Manager,Sales,Warranty,Consultant,Staff")]
        public async Task<ActionResult<IEnumerable<OrderListItemDto>>> GetOrdersByCustomer(int customerId)
        {
            var orders = await _context.Orders
                .Include(o => o.Customer)
                .Include(o => o.Orderitems)
                    .ThenInclude(oi => oi.Package)
                .Include(o => o.Orderitems)
                    .ThenInclude(oi => oi.ImeiNavigation)
                        .ThenInclude(inv => inv!.Variant)
                            .ThenInclude(v => v!.Product)
                .Include(o => o.Orderpayments)
                .Where(o => o.Customerid == customerId)
                .OrderByDescending(o => o.Orderdate)
                .ToListAsync();

            return Ok(orders.Select(MapToDto));
        }

        [HttpGet("user/{userId}")]
        [Authorize]
        public async Task<ActionResult<IEnumerable<OrderListItemDto>>> GetOrdersByUser(int userId)
        {
            var claimUserId = GetClaimUserId();
            if (!IsStaffOrAdmin(User) && claimUserId != userId)
            {
                return Forbid();
            }

            var orders = await _context.Orders
                .Include(o => o.Customer)
                .Include(o => o.Orderitems)
                    .ThenInclude(oi => oi.Package)
                .Include(o => o.Orderitems)
                    .ThenInclude(oi => oi.ImeiNavigation)
                        .ThenInclude(inv => inv!.Variant)
                            .ThenInclude(v => v!.Product)
                .Include(o => o.Orderpayments)
                .Where(o => o.Userid == userId)
                .OrderByDescending(o => o.Orderdate)
                .ToListAsync();

            return Ok(orders.Select(MapToDto));
        }

        [HttpGet("lookup")]
        public async Task<ActionResult<IEnumerable<OrderLookupDto>>> LookupOrders(
            [FromQuery] string? phone,
            [FromQuery] int? orderid)
        {
            if (string.IsNullOrWhiteSpace(phone))
                return BadRequest(new ApiErrorDto("Vui long nhap so dien thoai de tra cuu.", null));

            var query = _context.Orders
                .Include(o => o.Customer)
                .Where(o => o.Customer != null && o.Customer.Phone == phone);

            if (orderid.HasValue)
                query = query.Where(o => o.Orderid == orderid);

            var orders = await query
                .OrderByDescending(o => o.Orderdate)
                .Take(20)
                .ToListAsync();

            var result = orders.Select(o => new OrderLookupDto(
                o.Orderid,
                o.Orderdate,
                o.Orderstatus,
                o.Totalamount,
                o.Discountamount,
                o.Finalamount,
                o.Paymentmethod,
                o.Vouchercode,
                o.Orderitems.Count
            ));

            return Ok(result);
        }

        [HttpPost]
        [AllowAnonymous]
        public async Task<ActionResult<OrderDetailDto>> PostOrder([FromBody] CreateOrderRequestDto dto)
        {
            if (dto.Items == null || dto.Items.Count == 0)
                return BadRequest(new ApiErrorDto("Don hang phai co it nhat 1 san pham.", null));

            var claimUserId = GetClaimUserId();
            var isAuthenticated = claimUserId.HasValue;
            var isGuest = !isAuthenticated;
            var userId = claimUserId;

            if (dto.Userid.HasValue && dto.Userid != claimUserId)
            {
                if (!IsStaffOrAdmin(User))
                {
                    return StatusCode(403, new ApiErrorDto("Ban khong co quyen tao don cho nguoi dung khac.", null));
                }
                userId = dto.Userid.Value;
                isGuest = false;
            }

            var paymentMethod = NormalizePaymentMethod(dto.Paymentmethod);
            if (!IsValidPaymentMethod(paymentMethod))
                return BadRequest(new ApiErrorDto("Phuong thuc thanh toan khong hop le.", null));

            if (isGuest && paymentMethod == "COD")
                return BadRequest(new ApiErrorDto("Khach vang lai khong the chon COD. Vui long dat coc 30% hoac thanh toan truoc 100%.", null));

            User? user = null;
            if (!isGuest)
            {
                user = await _context.Users.FindAsync(userId!.Value);
                if (user == null)
                    return BadRequest(new ApiErrorDto("User khong ton tai.", null));
            }

            var shippingName = (dto.Customername ?? user?.Fullname ?? string.Empty).Trim();
            var shippingPhone = (dto.Customerphone ?? user?.Phone ?? string.Empty).Trim();
            var shippingEmail = (dto.Customeremail ?? user?.Email)?.Trim();
            var shippingAddress = (dto.Shippingaddress ?? string.Empty).Trim();
            var guestToken = Request.Headers["x-guest-session-token"].FirstOrDefault();

            if (string.IsNullOrWhiteSpace(shippingName) ||
                string.IsNullOrWhiteSpace(shippingPhone) ||
                string.IsNullOrWhiteSpace(shippingAddress))
            {
                return BadRequest(new ApiErrorDto("Vui long nhap day du ho ten, so dien thoai va dia chi nhan hang.", null));
            }

            var abuseCheck = await _checkoutAbuseProtection.CheckAsync(
                HttpContext,
                shippingPhone,
                guestToken,
                isGuest);
            if (!abuseCheck.Allowed)
                return StatusCode(429, new ApiErrorDto(abuseCheck.Message ?? "Yeu cau checkout bi gioi han.", null));

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var customer = await FindOrCreateCustomerAsync(
                    shippingName,
                    shippingPhone,
                    shippingEmail,
                    shippingAddress);

                var order = new Order
                {
                    Userid = user?.Userid,
                    Customerid = customer.Customerid,
                    Orderstatus = StatusPending,
                    Paymentmethod = paymentMethod,
                    Paymentstatus = "Unpaid",
                    Checkouttype = isGuest ? "Guest" : "Registered",
                    Vouchercode = dto.Vouchercode,
                    Orderdate = DateTime.UtcNow,
                    Totalamount = 0,
                    Discountamount = 0,
                    Finalamount = 0,
                    Paidamount = 0,
                    Requiredpayment = 0,
                    Shippingname = shippingName,
                    Shippingphone = shippingPhone,
                    Shippingemail = shippingEmail,
                    Shippingaddress = shippingAddress,
                    Customernote = dto.Note,
                    Guesttoken = isGuest ? guestToken : null
                };

                foreach (var reqItem in dto.Items)
                {
                    var variant = await _context.Productvariants.FindAsync(reqItem.Variantid);
                    if (variant == null)
                        return BadRequest(new ApiErrorDto($"VariantId {reqItem.Variantid} khong ton tai.", null));

                    var availableItems = await _context.Inventoryitems
                        .Where(i => i.Variantid == reqItem.Variantid && i.Status == "InStock")
                        .OrderBy(i => i.Importedat)
                        .Take(reqItem.Quantity)
                        .ToListAsync();

                    if (availableItems.Count < reqItem.Quantity)
                    {
                        return BadRequest(new ApiErrorDto(
                            $"San pham VariantId {reqItem.Variantid} khong du ton kho. Chi con {availableItems.Count}.",
                            null));
                    }

                    var price = variant.Saleprice ?? variant.Baseprice;
                    Warrantypackage? package = null;
                    if (reqItem.Packageid.HasValue)
                    {
                        package = await _context.Warrantypackages.FindAsync(reqItem.Packageid);
                        if (package == null)
                            return BadRequest(new ApiErrorDto($"Goi bao hanh ID {reqItem.Packageid} khong ton tai.", null));
                    }

                    var packagePrice = package?.Price ?? 0;
                    foreach (var invItem in availableItems)
                    {
                        invItem.Status = "Reserved";
                        order.Orderitems.Add(new Orderitem
                        {
                            Imei = invItem.Imei,
                            Sellingprice = price,
                            Packageid = package?.Packageid,
                            Warrantyprice = packagePrice > 0 ? packagePrice : null
                        });
                        order.Inventorytransactions.Add(new Inventorytransaction
                        {
                            Imei = invItem.Imei,
                            Userid = claimUserId,
                            Transactiontype = "Reserve",
                            Fromstatus = "InStock",
                            Tostatus = "Reserved",
                            Note = "Inventory reserved for new order.",
                            Createdat = DateTime.UtcNow
                        });
                        order.Totalamount += price + packagePrice;
                    }
                }

                if (!string.IsNullOrWhiteSpace(dto.Vouchercode))
                {
                    var voucher = await _context.Vouchers.FirstOrDefaultAsync(v =>
                        v.Vouchercode == dto.Vouchercode && v.Isactive == true);
                    if (voucher == null)
                        return BadRequest(new ApiErrorDto("Voucher khong hop le hoac khong hoat dong.", null));

                    if (voucher.Validfrom.HasValue && voucher.Validfrom > DateTime.UtcNow)
                        return BadRequest(new ApiErrorDto("Voucher chua den thoi gian ap dung.", null));
                    if (voucher.Validto.HasValue && voucher.Validto < DateTime.UtcNow)
                        return BadRequest(new ApiErrorDto("Voucher da het han.", null));

                    if (voucher.Discountpercentage.HasValue && voucher.Discountpercentage > 0)
                    {
                        order.Discountamount = order.Totalamount * (decimal)(voucher.Discountpercentage / 100.0);
                    }
                    else if (voucher.Discountamount.HasValue && voucher.Discountamount > 0)
                    {
                        order.Discountamount = voucher.Discountamount.Value;
                    }
                }

                order.Finalamount = Math.Max(0, order.Totalamount - (order.Discountamount ?? 0));

                var paymentOption = NormalizePaymentOption(dto.Paymentoption);
                if (isGuest && string.IsNullOrEmpty(paymentOption))
                {
                    return BadRequest(new ApiErrorDto("Khach vang lai phai chon dat coc 30% hoac thanh toan truoc 100%.", null));
                }
                if (!isGuest && string.IsNullOrEmpty(paymentOption))
                {
                    paymentOption = paymentMethod == "COD" ? "COD" : "Full";
                }

                if (paymentMethod == "COD")
                {
                    order.Paymentstatus = "CODPending";
                    order.Requiredpayment = 0;
                    order.Depositpercentage = null;
                    order.Reservationexpiresat = null;
                    order.Paymenttoken = null;
                }
                else if (paymentOption == "Deposit30")
                {
                    order.Paymentstatus = "AwaitingDeposit";
                    order.Depositpercentage = 30;
                    order.Requiredpayment = Math.Round(order.Finalamount * 0.3m, 0, MidpointRounding.AwayFromZero);
                    order.Reservationexpiresat = DateTime.UtcNow.AddMinutes(15);
                    order.Paymenttoken = Guid.NewGuid().ToString("N");
                }
                else
                {
                    order.Paymentstatus = "AwaitingFullPayment";
                    order.Depositpercentage = null;
                    order.Requiredpayment = order.Finalamount;
                    order.Reservationexpiresat = DateTime.UtcNow.AddMinutes(15);
                    order.Paymenttoken = Guid.NewGuid().ToString("N");
                }

                order.Orderpayments.Add(new Orderpayment
                {
                    Provider = paymentMethod,
                    Paymenttype = paymentMethod == "COD" ? "COD" : paymentOption,
                    Amount = order.Requiredpayment ?? 0,
                    Status = paymentMethod == "COD" ? "NotRequired" : "Pending",
                    Createdat = DateTime.UtcNow
                });

                _context.Orders.Add(order);
                await _context.SaveChangesAsync();

                if (isGuest)
                {
                    await _checkoutAbuseProtection.MarkGuestPendingAsync(
                        guestToken,
                        shippingPhone,
                        order.Orderid);
                }

                await transaction.CommitAsync();

                var created = await _context.Orders
                    .Include(o => o.Customer)
                    .Include(o => o.Orderitems)
                        .ThenInclude(oi => oi.Package)
                    .Include(o => o.Orderitems)
                        .ThenInclude(oi => oi.ImeiNavigation)
                            .ThenInclude(inv => inv!.Variant)
                                .ThenInclude(v => v!.Product)
                    .Include(o => o.Orderpayments)
                    .FirstOrDefaultAsync(o => o.Orderid == order.Orderid);

                return CreatedAtAction(nameof(GetOrder), new { id = order.Orderid }, MapToDetailDto(created!));
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new ApiErrorDto(
                    "Loi he thong khi tao don hang.",
                    new Dictionary<string, string[]> { { "Error", new[] { ex.Message } } }));
            }
        }

        [HttpGet("{id}/payment")]
        [AllowAnonymous]
        public async Task<ActionResult<PaymentCheckoutDto>> GetPaymentCheckout(
            int id,
            [FromQuery] string? token)
        {
            var order = await _context.Orders
                .Include(item => item.Orderitems)
                .Include(item => item.Orderpayments)
                .FirstOrDefaultAsync(item => item.Orderid == id);
            if (order == null) return NotFound(new ApiErrorDto("Don hang khong ton tai.", null));
            if (string.IsNullOrWhiteSpace(token) || token != order.Paymenttoken)
                return StatusCode(403, new ApiErrorDto("Ma thanh toan khong hop le.", null));

            if (order.Reservationexpiresat.HasValue &&
                order.Reservationexpiresat <= DateTime.UtcNow &&
                order.Paymentstatus is not ("DepositPaid" or "Paid"))
            {
                await ExpireOrderAsync(order);
                await _context.SaveChangesAsync();
                return StatusCode(410, new ApiErrorDto("Don hang da het thoi gian thanh toan va da duoc huy.", null));
            }

            var amountDue = order.Paymentstatus == "DepositPaid"
                ? RemainingAmount(order)
                : order.Requiredpayment ?? RemainingAmount(order);
            return Ok(new PaymentCheckoutDto(
                order.Orderid,
                order.Paymentmethod,
                order.Paymentstatus,
                order.Finalamount,
                amountDue,
                order.Paidamount ?? 0,
                order.Reservationexpiresat,
                order.Shippingname));
        }

        [HttpPost("{id}/simulate-payment")]
        [AllowAnonymous]
        public async Task<ActionResult<PaymentActionResultDto>> SimulatePayment(
            int id,
            [FromBody] SimulatePaymentRequestDto dto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            var order = await _context.Orders
                .Include(item => item.Orderitems)
                    .ThenInclude(item => item.Package)
                .Include(item => item.Orderpayments)
                .FirstOrDefaultAsync(item => item.Orderid == id);
            if (order == null) return NotFound(new ApiErrorDto("Don hang khong ton tai.", null));
            if (dto.Paymenttoken != order.Paymenttoken)
                return StatusCode(403, new ApiErrorDto("Ma thanh toan khong hop le.", null));
            if (order.Orderstatus == StatusCancelled)
                return Conflict(new ApiErrorDto("Don hang da bi huy.", null));
            if (order.Paymentmethod == "COD")
                return BadRequest(new ApiErrorDto("Don COD khong su dung cong thanh toan online.", null));

            if (order.Reservationexpiresat.HasValue &&
                order.Reservationexpiresat <= DateTime.UtcNow &&
                order.Paymentstatus is not ("DepositPaid" or "Paid"))
            {
                await ExpireOrderAsync(order);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return StatusCode(410, new ApiErrorDto("Don hang da het thoi gian thanh toan va da duoc huy.", null));
            }

            if (!dto.Success)
            {
                order.Orderpayments.Add(new Orderpayment
                {
                    Provider = order.Paymentmethod ?? "UNKNOWN",
                    Paymenttype = "Simulation",
                    Amount = order.Paymentstatus == "DepositPaid"
                        ? RemainingAmount(order)
                        : order.Requiredpayment ?? 0,
                    Status = "Failed",
                    Transactionref = $"SIM-FAILED-{id}-{DateTime.UtcNow:yyyyMMddHHmmss}",
                    Createdat = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return BadRequest(new ApiErrorDto("Thanh toan gia lap that bai. Ban co the thu lai truoc khi het han.", null));
            }

            if (order.Paymentstatus == "Paid")
                return Conflict(new ApiErrorDto("Don hang da thanh toan du.", null));

            var amount = order.Paymentstatus == "DepositPaid"
                ? RemainingAmount(order)
                : order.Requiredpayment ?? RemainingAmount(order);
            var result = await RecordSuccessfulPaymentAsync(order, amount, null, "SIM");
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return Ok(result);
        }

        [HttpPost("{id}/confirm-payment")]
        [Authorize(Roles = "Admin,Manager,Sales,Staff")]
        public async Task<ActionResult<PaymentActionResultDto>> ConfirmPayment(
            int id,
            [FromBody] ConfirmPaymentRequestDto dto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            var order = await _context.Orders
                .Include(item => item.Orderpayments)
                .FirstOrDefaultAsync(item => item.Orderid == id);
            if (order == null) return NotFound(new ApiErrorDto("Don hang khong ton tai.", null));
            if (order.Orderstatus == StatusCancelled)
                return Conflict(new ApiErrorDto("Khong the xac nhan thanh toan cho don da huy.", null));
            if (order.Paymentmethod == "COD")
                return BadRequest(new ApiErrorDto("COD duoc ghi nhan thanh toan khi don hoan thanh.", null));
            if (order.Paymentstatus == "Paid")
                return Conflict(new ApiErrorDto("Don hang da thanh toan du.", null));

            var minimumAmount = order.Paymentstatus == "DepositPaid"
                ? RemainingAmount(order)
                : order.Requiredpayment ?? RemainingAmount(order);
            var amount = dto.Amount ?? minimumAmount;
            if (amount <= 0 || amount > RemainingAmount(order))
                return BadRequest(new ApiErrorDto("So tien xac nhan khong hop le.", null));
            if (order.Paymentstatus is "AwaitingDeposit" or "AwaitingFullPayment" && amount < minimumAmount)
                return BadRequest(new ApiErrorDto("So tien chua dat muc thanh toan bat buoc cua don hang.", null));

            var result = await RecordSuccessfulPaymentAsync(order, amount, dto.Transactionref, "STAFF");
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return Ok(result);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Manager,Sales,Staff")]
        public async Task<IActionResult> PutOrder(int id, [FromBody] UpdateOrderRequestDto dto)
        {
            var order = await _context.Orders.FindAsync(id);
            if (order == null) return NotFound();

            order.Paymentmethod = NormalizePaymentMethod(dto.Paymentmethod);
            order.Vouchercode = dto.Vouchercode;

            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Orders.Any(e => e.Orderid == id)) return NotFound();
                throw;
            }

            var updated = await _context.Orders
                .Include(o => o.Customer)
                .Include(o => o.Orderitems)
                .FirstOrDefaultAsync(o => o.Orderid == order.Orderid);

            return Ok(MapToDetailDto(updated!));
        }

        [HttpPatch("{id}/status")]
        [Authorize(Roles = "Admin,Manager,Sales,Staff")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateOrderStatusRequestDto dto)
        {
            var validTransitions = ValidTransitions();

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var order = await _context.Orders
                    .Include(o => o.Orderitems)
                        .ThenInclude(item => item.Package)
                    .Include(o => o.Orderpayments)
                    .FirstOrDefaultAsync(o => o.Orderid == id);

                if (order == null) return NotFound();

                var currentStatus = order.Orderstatus ?? StatusPending;
                var newStatus = dto.Status;

                if (currentStatus == StatusCancelled || currentStatus == StatusCompleted)
                {
                    return BadRequest(new ApiErrorDto($"Don hang da ket thuc o trang thai {currentStatus}.", null));
                }

                if (!validTransitions.ContainsKey(currentStatus) || !validTransitions[currentStatus].Contains(newStatus))
                {
                    return BadRequest(new ApiErrorDto($"Khong the chuyen trang thai tu {currentStatus} sang {newStatus}.", null));
                }

                if (newStatus == StatusProcessing && !IsPaymentReadyForProcessing(order))
                {
                    return BadRequest(new ApiErrorDto(
                        "Don hang chua dat coc/thanh toan du dieu kien de chuyen sang xu ly.",
                        null));
                }

                if (newStatus == StatusCompleted &&
                    order.Paymentmethod != "COD" &&
                    order.Paymentstatus != "Paid")
                {
                    return BadRequest(new ApiErrorDto(
                        "Don hang online phai thanh toan du truoc khi hoan thanh.",
                        null));
                }

                await ApplyInventoryForStatusAsync(order, newStatus);
                order.Orderstatus = newStatus;

                if (newStatus == StatusCompleted && order.Paymentmethod == "COD")
                {
                    order.Paymentstatus = "Paid";
                    order.Paidamount = order.Finalamount;
                }
                if (newStatus == StatusCancelled)
                {
                    order.Cancellationreason ??= "Nhan vien huy don.";
                    foreach (var payment in order.Orderpayments.Where(item => item.Status == "Pending"))
                    {
                        payment.Status = "Cancelled";
                    }
                    if (!string.IsNullOrWhiteSpace(order.Shippingphone))
                    {
                        await _checkoutAbuseProtection.ReleaseGuestPendingAsync(order.Guesttoken, order.Shippingphone);
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new UpdateOrderStatusResponseDto(order.Orderid, order.Orderstatus));
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new ApiErrorDto(
                    "Loi khi cap nhat trang thai don hang.",
                    new Dictionary<string, string[]> { { "Error", new[] { ex.Message } } }));
            }
        }

        [HttpPost("bulk-status")]
        [Authorize(Roles = "Admin,Manager,Sales,Staff")]
        public async Task<IActionResult> BulkUpdateStatus(
            [FromBody] BulkUpdateStatusRequestDto dto,
            [FromServices] ILogger<OrdersController> logger)
        {
            var validTransitions = ValidTransitions();

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var orders = await _context.Orders
                    .Include(o => o.Orderitems)
                        .ThenInclude(item => item.Package)
                    .Include(o => o.Orderpayments)
                    .Where(o => dto.OrderIds.Contains(o.Orderid))
                    .ToListAsync();

                if (!orders.Any())
                    return BadRequest(new ApiErrorDto("Khong tim thay don hang nao.", null));

                var updatedOrderIds = new List<int>();
                var failed = new List<BulkUpdateFailedItemDto>();

                foreach (var order in orders)
                {
                    var currentStatus = order.Orderstatus ?? StatusPending;
                    var newStatus = dto.Status;

                    if (currentStatus == StatusCancelled || currentStatus == StatusCompleted)
                    {
                        failed.Add(new BulkUpdateFailedItemDto(order.Orderid, $"Don hang da ket thuc o trang thai {currentStatus}."));
                        continue;
                    }

                    if (!validTransitions.ContainsKey(currentStatus) || !validTransitions[currentStatus].Contains(newStatus))
                    {
                        failed.Add(new BulkUpdateFailedItemDto(order.Orderid, $"Khong the chuyen tu {currentStatus} sang {newStatus}."));
                        continue;
                    }

                    if (newStatus == StatusProcessing && !IsPaymentReadyForProcessing(order))
                    {
                        failed.Add(new BulkUpdateFailedItemDto(
                            order.Orderid,
                            "Don hang chua dat coc/thanh toan du dieu kien."));
                        continue;
                    }

                    if (newStatus == StatusCompleted &&
                        order.Paymentmethod != "COD" &&
                        order.Paymentstatus != "Paid")
                    {
                        failed.Add(new BulkUpdateFailedItemDto(
                            order.Orderid,
                            "Don online chua thanh toan du."));
                        continue;
                    }

                    await ApplyInventoryForStatusAsync(order, newStatus);
                    order.Orderstatus = newStatus;
                    if (newStatus == StatusCompleted && order.Paymentmethod == "COD")
                    {
                        order.Paymentstatus = "Paid";
                        order.Paidamount = order.Finalamount;
                    }
                    if (newStatus == StatusCancelled)
                    {
                        order.Cancellationreason ??= "Nhan vien huy don.";
                        foreach (var payment in order.Orderpayments.Where(item => item.Status == "Pending"))
                        {
                            payment.Status = "Cancelled";
                        }
                        if (!string.IsNullOrWhiteSpace(order.Shippingphone))
                        {
                            await _checkoutAbuseProtection.ReleaseGuestPendingAsync(order.Guesttoken, order.Shippingphone);
                        }
                    }
                    updatedOrderIds.Add(order.Orderid);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                var message = failed.Any()
                    ? $"Cap nhat thanh cong {updatedOrderIds.Count} don hang, {failed.Count} loi."
                    : $"Da cap nhat thanh cong {updatedOrderIds.Count} don hang.";

                return Ok(new BulkUpdateStatusResponseDto(updatedOrderIds, failed, message));
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Bulk order status update failed.");
                await transaction.RollbackAsync();
                return StatusCode(500, new ApiErrorDto("Loi he thong khi cap nhat trang thai.", null));
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteOrder(int id)
        {
            var order = await _context.Orders.FindAsync(id);
            if (order == null) return NotFound();
            _context.Orders.Remove(order);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
