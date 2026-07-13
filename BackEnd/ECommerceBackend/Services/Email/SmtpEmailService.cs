using System.Net;
using System.Net.Mail;
using System.Text;
using ECommerceBackend.Models;
using Microsoft.Extensions.Options;

namespace ECommerceBackend.Services.Email;

public sealed class SmtpEmailService : IEmailService
{
    private readonly EmailOptions _options;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(IOptions<EmailOptions> options, ILogger<SmtpEmailService> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public bool IsConfigured =>
        _options.Enabled &&
        !string.IsNullOrWhiteSpace(_options.Host) &&
        !string.IsNullOrWhiteSpace(_options.Username) &&
        !string.IsNullOrWhiteSpace(_options.Password);

    public bool RequireRegistrationOtp => _options.RequireRegistrationOtp;

    public Task SendRegistrationOtpAsync(string email, string code, CancellationToken cancellationToken = default)
    {
        const string subject = "Mã xác nhận đăng ký tài khoản Cuồng Điện Thoại";
        var body = BuildEmailLayout(
            "Xác nhận đăng ký tài khoản",
            $"Mã xác nhận của bạn là <strong style=\"font-size:24px;letter-spacing:4px;color:#e30613\">{WebUtility.HtmlEncode(code)}</strong>.",
            "Mã có hiệu lực trong 10 phút. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.");

        return SendAsync(
            email,
            subject,
            body,
            cancellationToken,
            fallbackLog: $"Registration OTP for {email}: {code}");
    }

    public Task SendTestEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        var subject = $"Test Gmail SMTP - {DateTime.Now:HH:mm dd/MM/yyyy}";
        var body = BuildEmailLayout(
            "Gmail SMTP đã sẵn sàng",
            "Email này được gửi từ backend Cuồng Điện Thoại qua cấu hình SMTP.",
            "Nếu bạn nhận được email này, chức năng gửi mã xác nhận và thông báo đơn hàng có thể hoạt động.");

        return SendAsync(email, subject, body, cancellationToken);
    }

    public Task SendOrderCreatedAsync(Order order, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(order.Shippingemail)) return Task.CompletedTask;

        var subject = $"Cuồng Điện Thoại đã tiếp nhận đơn hàng #{order.Orderid}";
        var body = BuildEmailLayout(
            $"Đơn hàng #{order.Orderid} đã được tạo",
            $"Xin chào <strong>{WebUtility.HtmlEncode(order.Shippingname ?? "quý khách")}</strong>, đơn hàng của bạn đã được tiếp nhận thành công.",
            $"""
            <p><strong>Tổng thanh toán:</strong> {FormatCurrency(order.Finalamount)}</p>
            <p><strong>Trạng thái thanh toán:</strong> {WebUtility.HtmlEncode(order.Paymentstatus)}</p>
            <p>Nếu đơn hàng cần đặt cọc hoặc thanh toán trước, vui lòng hoàn tất trong thời gian giữ hàng.</p>
            """);

        return SendAsync(order.Shippingemail, subject, body, cancellationToken);
    }

    public Task SendPaymentUpdatedAsync(Order order, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(order.Shippingemail)) return Task.CompletedTask;

        var subject = $"Cập nhật thanh toán đơn hàng #{order.Orderid}";
        var body = BuildEmailLayout(
            $"Thanh toán đơn hàng #{order.Orderid}",
            $"Xin chào <strong>{WebUtility.HtmlEncode(order.Shippingname ?? "quý khách")}</strong>, đơn hàng của bạn vừa được cập nhật thanh toán.",
            $"""
            <p><strong>Đã thanh toán:</strong> {FormatCurrency(order.Paidamount ?? 0)}</p>
            <p><strong>Còn lại:</strong> {FormatCurrency(Math.Max(0, order.Finalamount - (order.Paidamount ?? 0)))}</p>
            <p><strong>Trạng thái thanh toán:</strong> {WebUtility.HtmlEncode(order.Paymentstatus)}</p>
            """);

        return SendAsync(order.Shippingemail, subject, body, cancellationToken);
    }

    public Task SendOrderStatusUpdatedAsync(Order order, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(order.Shippingemail)) return Task.CompletedTask;

        var subject = $"Đơn hàng #{order.Orderid} đã cập nhật trạng thái";
        var body = BuildEmailLayout(
            $"Trạng thái đơn hàng #{order.Orderid}",
            $"Xin chào <strong>{WebUtility.HtmlEncode(order.Shippingname ?? "quý khách")}</strong>, đơn hàng của bạn hiện đang ở trạng thái <strong>{WebUtility.HtmlEncode(order.Orderstatus)}</strong>.",
            "Bạn có thể tra cứu đơn hàng trên website Cuồng Điện Thoại bằng mã đơn và số điện thoại đã đặt.");

        return SendAsync(order.Shippingemail, subject, body, cancellationToken);
    }

    private async Task SendAsync(
        string to,
        string subject,
        string body,
        CancellationToken cancellationToken,
        string? fallbackLog = null)
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

        using var message = new MailMessage
        {
            From = new MailAddress(
                string.IsNullOrWhiteSpace(_options.FromEmail) ? _options.Username : _options.FromEmail,
                _options.FromName),
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

    private static bool IsReservedTestAddress(string email)
    {
        var atIndex = email.LastIndexOf('@');
        if (atIndex < 0 || atIndex == email.Length - 1) return false;
        var domain = email[(atIndex + 1)..].Trim().ToLowerInvariant();
        return domain is "example.com" or "example.net" or "example.org" ||
               domain.EndsWith(".invalid", StringComparison.Ordinal);
    }

    private static string BuildEmailLayout(string title, string leadHtml, string bodyHtml)
    {
        return $$"""
            <!doctype html>
            <html lang="vi">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width,initial-scale=1">
            </head>
            <body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827">
              <div style="max-width:560px;margin:0 auto;padding:24px">
                <div style="background:#ffffff;border-radius:18px;border:1px solid #e5e7eb;overflow:hidden">
                  <div style="background:#e30613;color:#ffffff;padding:18px 22px">
                    <div style="font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Cuồng Điện Thoại</div>
                    <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3">{{WebUtility.HtmlEncode(title)}}</h1>
                  </div>
                  <div style="padding:22px;font-size:15px;line-height:1.7">
                    <p style="margin:0 0 14px">{{leadHtml}}</p>
                    <div style="margin:0;color:#374151">{{bodyHtml}}</div>
                    <p style="margin:22px 0 0;color:#6b7280;font-size:13px">Email được gửi tự động từ hệ thống Cuồng Điện Thoại.</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
            """;
    }

    private static string FormatCurrency(decimal amount) =>
        string.Format(System.Globalization.CultureInfo.GetCultureInfo("vi-VN"), "{0:N0} đ", amount);
}
