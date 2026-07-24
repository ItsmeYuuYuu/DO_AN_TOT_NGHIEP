using System.Net;
using System.Net.Mail;
using System.Text;
using ECommerceBackend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using ECommerceBackend.Time;

namespace ECommerceBackend.Services.Email;

public sealed class SmtpEmailService : IEmailService
{
    private readonly EmailOptions _options;
    private readonly ILogger<SmtpEmailService> _logger;
    private readonly ECommerceContext _context;

    public SmtpEmailService(IOptions<EmailOptions> options, ILogger<SmtpEmailService> logger, ECommerceContext context)
    {
        _options = options.Value;
        _logger = logger;
        _context = context;
    }

    public bool IsConfigured => _options.Enabled &&
        !string.IsNullOrWhiteSpace(_options.Host) &&
        !string.IsNullOrWhiteSpace(_options.Username) &&
        !string.IsNullOrWhiteSpace(_options.Password);

    public bool RequireRegistrationOtp => _options.RequireRegistrationOtp;

    public Task SendRegistrationOtpAsync(string email, string code, CancellationToken cancellationToken = default) =>
        SendAsync(email, "Mã xác nhận đăng ký tài khoản Cuồng Điện Thoại", BuildEmailLayout(
            "Xác nhận đăng ký tài khoản",
            $"Mã xác nhận của bạn là <strong style=\"font-size:24px;letter-spacing:4px;color:#e30613\">{WebUtility.HtmlEncode(code)}</strong>.",
            "Mã có hiệu lực trong 10 phút. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email."), cancellationToken,
            $"Registration OTP for {email}: {code}");

    public Task SendPasswordResetOtpAsync(string email, string code, CancellationToken cancellationToken = default) =>
        SendAsync(email, "Mã khôi phục mật khẩu Cuồng Điện Thoại", BuildEmailLayout(
            "Khôi phục mật khẩu",
            $"Mã xác nhận đặt lại mật khẩu của bạn là <strong style=\"font-size:24px;letter-spacing:4px;color:#e30613\">{WebUtility.HtmlEncode(code)}</strong>.",
            "Mã có hiệu lực trong 10 phút và chỉ được sử dụng một lần. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này."), cancellationToken,
            $"Password reset OTP for {email}: {code}");

    public Task SendTestEmailAsync(string email, CancellationToken cancellationToken = default) =>
        SendAsync(email, $"Test Gmail SMTP - {VietnamTime.Now:HH:mm dd/MM/yyyy}", BuildEmailLayout(
            "Gmail SMTP đã sẵn sàng",
            "Email này được gửi từ backend Cuồng Điện Thoại qua cấu hình SMTP.",
            "Chức năng gửi mã xác nhận và thông báo đơn hàng đang hoạt động."), cancellationToken);

    public async Task SendOrderCreatedAsync(Order order, CancellationToken cancellationToken = default)
    {
        order = await LoadOrderAsync(order.Orderid, cancellationToken) ?? order;
        if (string.IsNullOrWhiteSpace(order.Shippingemail)) return;
        await SendAsync(order.Shippingemail, $"Cuồng Điện Thoại đã tiếp nhận đơn hàng #{order.Orderid}",
            BuildEmailLayout($"Đơn hàng #{order.Orderid} đã được tạo",
                $"Xin chào <strong>{Encode(order.Shippingname ?? "quý khách")}</strong>, đơn hàng của bạn đã được tiếp nhận thành công.",
                BuildOrderDetailsHtml(order)), cancellationToken);
    }

    public async Task SendPaymentUpdatedAsync(Order order, CancellationToken cancellationToken = default)
    {
        order = await LoadOrderAsync(order.Orderid, cancellationToken) ?? order;
        if (string.IsNullOrWhiteSpace(order.Shippingemail)) return;
        await SendAsync(order.Shippingemail, $"Cập nhật thanh toán đơn hàng #{order.Orderid}",
            BuildEmailLayout($"Thanh toán đơn hàng #{order.Orderid}",
                $"Xin chào <strong>{Encode(order.Shippingname ?? "quý khách")}</strong>, thanh toán của đơn hàng vừa được cập nhật.",
                BuildOrderDetailsHtml(order)), cancellationToken);
    }

    public async Task SendOrderStatusUpdatedAsync(Order order, CancellationToken cancellationToken = default)
    {
        order = await LoadOrderAsync(order.Orderid, cancellationToken) ?? order;
        if (string.IsNullOrWhiteSpace(order.Shippingemail)) return;
        var statusLabel = OrderStatusLabel(order.Orderstatus);
        await SendAsync(order.Shippingemail, $"Đơn hàng #{order.Orderid} đã cập nhật trạng thái",
            BuildEmailLayout($"Trạng thái đơn hàng #{order.Orderid}",
                $"Xin chào <strong>{Encode(order.Shippingname ?? "quý khách")}</strong>, đơn hàng hiện ở trạng thái <strong>{Encode(statusLabel)}</strong>.",
                BuildOrderDetailsHtml(order)), cancellationToken);
    }

    public async Task SendShipmentStatusUpdatedAsync(
        Order order,
        Shipment shipment,
        CancellationToken cancellationToken = default)
    {
        order = await LoadOrderAsync(order.Orderid, cancellationToken) ?? order;
        if (string.IsNullOrWhiteSpace(order.Shippingemail)) return;

        var statusLabel = ShipmentStatusLabel(shipment.Status);
        var shipmentHtml = $"""
            <table role="presentation" style="width:100%;border-collapse:collapse;margin:14px 0">
              <tr><td><strong>Trạng thái giao hàng</strong></td><td style="text-align:right">{Encode(statusLabel)}</td></tr>
              <tr><td><strong>Đơn vị vận chuyển</strong></td><td style="text-align:right">{Encode(shipment.Carrier)}</td></tr>
              <tr><td><strong>Mã vận đơn</strong></td><td style="text-align:right">{Encode(shipment.Trackingcode)}</td></tr>
              {(shipment.Estimateddeliveryat.HasValue ? $"<tr><td><strong>Dự kiến giao</strong></td><td style=\"text-align:right\">{FormatVietnamTime(shipment.Estimateddeliveryat, "dd/MM/yyyy")}</td></tr>" : string.Empty)}
            </table>
            {BuildOrderDetailsHtml(order)}
            """;

        await SendAsync(
            order.Shippingemail,
            $"{statusLabel} - đơn hàng #{order.Orderid}",
            BuildEmailLayout(
                $"Cập nhật giao hàng đơn #{order.Orderid}",
                $"Xin chào <strong>{Encode(order.Shippingname ?? "quý khách")}</strong>, đơn hàng của bạn hiện ở trạng thái <strong>{Encode(statusLabel)}</strong>.",
                shipmentHtml),
            cancellationToken);
    }

    private Task<Order?> LoadOrderAsync(int orderId, CancellationToken cancellationToken) =>
        _context.Orders.AsNoTracking()
            .Include(order => order.Orderitems).ThenInclude(item => item.Package)
            .Include(order => order.Orderitems).ThenInclude(item => item.ImeiNavigation)
                .ThenInclude(inventory => inventory!.Variant).ThenInclude(variant => variant!.Product)
            .FirstOrDefaultAsync(order => order.Orderid == orderId, cancellationToken);

    private static string BuildOrderDetailsHtml(Order order)
    {
        var rows = order.Orderitems.Select((item, index) =>
        {
            // Email intentionally never reads or prints Inventoryitem.Imei or Productvariant.Sku.
            var name = Encode(item.ImeiNavigation?.Variant?.Product?.Productname ?? $"Sản phẩm {index + 1}");
            var warranty = string.IsNullOrWhiteSpace(item.Package?.Packagename) ? string.Empty :
                $"<div style=\"font-size:12px;color:#6b7280\">Bảo hành: {Encode(item.Package.Packagename)} ({FormatCurrency(item.Warrantyprice ?? 0)})</div>";
            return $"<tr><td style=\"padding:10px 0;border-bottom:1px solid #e5e7eb\"><strong>{name}</strong>{warranty}</td><td style=\"padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap\">{FormatCurrency(item.Sellingprice + (item.Warrantyprice ?? 0))}</td></tr>";
        });

        return $"""
            <table role="presentation" style="width:100%;border-collapse:collapse;margin:14px 0">
              <tr><td><strong>Mã đơn hàng</strong></td><td style="text-align:right">#{order.Orderid}</td></tr>
              <tr><td><strong>Ngày đặt</strong></td><td style="text-align:right">{FormatVietnamTime(order.Orderdate, "dd/MM/yyyy HH:mm")}</td></tr>
              <tr><td><strong>Người nhận</strong></td><td style="text-align:right">{Encode(order.Shippingname)}</td></tr>
              <tr><td><strong>Số điện thoại</strong></td><td style="text-align:right">{Encode(order.Shippingphone)}</td></tr>
              <tr><td><strong>Địa chỉ</strong></td><td style="text-align:right">{Encode(order.Shippingaddress)}</td></tr>
            </table>
            <h3 style="margin:18px 0 4px">Chi tiết sản phẩm</h3>
            <table role="presentation" style="width:100%;border-collapse:collapse">{string.Concat(rows)}</table>
            <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:14px">
              <tr><td>Tạm tính</td><td style="text-align:right">{FormatCurrency(order.Totalamount)}</td></tr>
              <tr><td>Giảm giá</td><td style="text-align:right">-{FormatCurrency(order.Discountamount ?? 0)}</td></tr>
              <tr><td style="padding-top:8px"><strong>Thành tiền</strong></td><td style="padding-top:8px;text-align:right;color:#e30613"><strong>{FormatCurrency(order.Finalamount)}</strong></td></tr>
              <tr><td>Đã thanh toán</td><td style="text-align:right">{FormatCurrency(order.Paidamount ?? 0)}</td></tr>
              <tr><td>Còn lại</td><td style="text-align:right">{FormatCurrency(Math.Max(0, order.Finalamount - (order.Paidamount ?? 0)))}</td></tr>
              <tr><td>Phương thức</td><td style="text-align:right">{Encode(order.Paymentmethod)}</td></tr>
              <tr><td>Trạng thái đơn</td><td style="text-align:right">{Encode(OrderStatusLabel(order.Orderstatus))}</td></tr>
              <tr><td>Trạng thái thanh toán</td><td style="text-align:right">{Encode(PaymentStatusLabel(order.Paymentstatus))}</td></tr>
            </table>
            """;
    }

    private static string FormatVietnamTime(DateTime? value, string format) =>
        value.HasValue ? VietnamTime.FromUtc(value.Value).ToString(format) : "—";

    private async Task SendAsync(string to, string subject, string body, CancellationToken cancellationToken, string? fallbackLog = null)
    {
        if (IsReservedTestAddress(to))
        {
            _logger.LogInformation("Skipped SMTP delivery to reserved test address {Recipient}. Subject: {Subject}", to, subject);
            return;
        }
        if (!IsConfigured)
        {
            _logger.LogInformation("Email is not configured. {Fallback}", fallbackLog ?? $"{subject} -> {to}");
            return;
        }

        try
        {
            using var message = new MailMessage
            {
                From = new MailAddress(string.IsNullOrWhiteSpace(_options.FromEmail) ? _options.Username : _options.FromEmail, _options.FromName),
                Subject = subject,
                Body = body,
                IsBodyHtml = true,
                SubjectEncoding = Encoding.UTF8,
                BodyEncoding = Encoding.UTF8
            };
            message.To.Add(to);
            using var client = new SmtpClient(_options.Host, _options.Port)
            {
                EnableSsl = _options.EnableSsl,
                Credentials = new NetworkCredential(_options.Username, _options.Password)
            };
            await client.SendMailAsync(message, cancellationToken);
        }
        catch (Exception exception)
        {
            _logger.LogError(
                exception,
                "Could not send email '{Subject}' to {Recipient}. The business operation remains completed.",
                subject,
                to);
        }
    }

    private static string ShipmentStatusLabel(string? status) => status switch
    {
        "PickedUp" => "Đơn vị vận chuyển đã nhận hàng",
        "InTransit" => "Đơn hàng đang vận chuyển",
        "OutForDelivery" => "Đơn hàng đang được giao",
        "DeliveryFailed" => "Giao hàng chưa thành công",
        "Delivered" => "Giao hàng thành công",
        "DamageClaim" => "Đơn hàng gặp sự cố hư hỏng",
        "LostClaim" => "Đơn hàng đang được xác minh thất lạc",
        "ReturnedToWarehouse" => "Đơn hàng đã hoàn về cửa hàng",
        _ => "Trạng thái giao hàng đã được cập nhật"
    };

    private static string OrderStatusLabel(string? status) => status switch
    {
        "Pending" => "Chờ cửa hàng xác nhận",
        "Processing" => "Đang xử lý và chuẩn bị hàng",
        "Shipped" => "Đã xuất giao",
        "Completed" => "Giao hàng thành công",
        "Cancelled" => "Đã hủy",
        "Returned" => "Đã hoàn về cửa hàng",
        _ => status ?? "Chưa xác định"
    };

    private static string PaymentStatusLabel(string? status) => status switch
    {
        "Unpaid" => "Chưa thanh toán",
        "AwaitingDeposit" => "Chờ thanh toán tiền cọc",
        "AwaitingFullPayment" => "Chờ thanh toán toàn bộ",
        "DepositPaid" => "Đã thanh toán tiền cọc",
        "CODPending" => "Thanh toán khi nhận hàng",
        "Paid" => "Đã thanh toán",
        "Cancelled" => "Đã hủy",
        "Refunded" => "Đã hoàn tiền",
        _ => status ?? "Chưa xác định"
    };

    private static bool IsReservedTestAddress(string email)
    {
        var at = email.LastIndexOf('@');
        if (at < 0 || at == email.Length - 1) return false;
        var domain = email[(at + 1)..].Trim().ToLowerInvariant();
        return domain is "example.com" or "example.net" or "example.org" || domain.EndsWith(".invalid", StringComparison.Ordinal);
    }

    private static string BuildEmailLayout(string title, string leadHtml, string bodyHtml) => $$"""
        <!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827">
          <div style="max-width:620px;margin:0 auto;padding:24px"><div style="background:#fff;border-radius:18px;border:1px solid #e5e7eb;overflow:hidden">
            <div style="background:#e30613;color:#fff;padding:18px 22px"><div style="font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Cuồng Điện Thoại</div><h1 style="margin:8px 0 0;font-size:22px;line-height:1.3">{{Encode(title)}}</h1></div>
            <div style="padding:22px;font-size:15px;line-height:1.7"><p style="margin:0 0 14px">{{leadHtml}}</p><div style="margin:0;color:#374151">{{bodyHtml}}</div><p style="margin:22px 0 0;color:#6b7280;font-size:13px">Email được gửi tự động từ hệ thống Cuồng Điện Thoại.</p></div>
          </div></div>
        </body></html>
        """;

    private static string Encode(string? value) => WebUtility.HtmlEncode(value ?? "—");
    private static string FormatCurrency(decimal amount) => string.Format(System.Globalization.CultureInfo.GetCultureInfo("vi-VN"), "{0:N0} đ", amount);
}
