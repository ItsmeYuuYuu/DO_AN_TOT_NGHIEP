using ECommerceBackend.Models;
using Microsoft.EntityFrameworkCore;

namespace ECommerceBackend.Services.Checkout;

public sealed record VoucherLine(int Productid, decimal Unitprice, int Quantity);

public sealed record VoucherEvaluation(
    bool Isvalid,
    string? Error,
    Voucher? Voucher,
    decimal Eligiblesubtotal,
    decimal Discountamount);

public interface IVoucherPolicyService
{
    Task<VoucherEvaluation> EvaluateAsync(
        string code,
        IReadOnlyCollection<VoucherLine> lines,
        int? userid = null,
        string? customerphone = null,
        bool checkreuse = true,
        CancellationToken cancellationToken = default);
}

public sealed class VoucherPolicyService : IVoucherPolicyService
{
    private readonly ECommerceContext _context;

    public VoucherPolicyService(ECommerceContext context)
    {
        _context = context;
    }

    public async Task<VoucherEvaluation> EvaluateAsync(
        string code,
        IReadOnlyCollection<VoucherLine> lines,
        int? userid = null,
        string? customerphone = null,
        bool checkreuse = true,
        CancellationToken cancellationToken = default)
    {
        var normalizedCode = code.Trim().ToUpperInvariant();
        var voucher = await _context.Vouchers
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Vouchercode == normalizedCode, cancellationToken);

        if (voucher == null || voucher.Isactive != true)
            return Invalid("Voucher không hợp lệ hoặc không hoạt động.", voucher);

        var now = DateTime.UtcNow;
        if (voucher.Validfrom.HasValue && voucher.Validfrom.Value > now)
            return Invalid("Voucher chưa đến thời gian áp dụng.", voucher);
        if (voucher.Validto.HasValue && voucher.Validto.Value < now)
            return Invalid("Voucher đã hết hạn.", voucher);

        if (checkreuse && (userid.HasValue || !string.IsNullOrWhiteSpace(customerphone)))
        {
            var normalizedPhone = customerphone?.Trim();
            var alreadyUsed = await _context.Orders.AnyAsync(order =>
                order.Vouchercode == normalizedCode
                && order.Orderstatus != "Cancelled"
                && ((userid.HasValue && order.Userid == userid.Value)
                    || (normalizedPhone != null && order.Customer != null && order.Customer.Phone == normalizedPhone)),
                cancellationToken);

            if (alreadyUsed)
                return Invalid("Bạn đã sử dụng mã giảm giá này rồi. Mỗi khách hàng chỉ được dùng một lần.", voucher);
        }

        if (lines.Count == 0)
            return Invalid("Giỏ hàng chưa có sản phẩm để áp dụng voucher.", voucher);

        var applicableProductIds = voucher.Applicableproductids ?? [];
        var eligibleLines = applicableProductIds.Length == 0
            ? lines
            : lines.Where(line => applicableProductIds.Contains(line.Productid)).ToArray();

        var eligibleSubtotal = eligibleLines.Sum(line => line.Unitprice * line.Quantity);
        if (eligibleSubtotal <= 0)
            return Invalid("Voucher không áp dụng cho các sản phẩm trong giỏ hàng.", voucher);

        if (voucher.Minimumorderamount.HasValue && eligibleSubtotal < voucher.Minimumorderamount.Value)
        {
            return Invalid(
                $"Giá trị các sản phẩm đủ điều kiện phải đạt tối thiểu {voucher.Minimumorderamount.Value:N0}đ.",
                voucher,
                eligibleSubtotal);
        }

        decimal discount;
        if (voucher.Discountpercentage is > 0)
        {
            discount = Math.Round(
                eligibleSubtotal * (decimal)(voucher.Discountpercentage.Value / 100d),
                0,
                MidpointRounding.AwayFromZero);

            if (voucher.Maximumdiscountamount is > 0)
                discount = Math.Min(discount, voucher.Maximumdiscountamount.Value);
        }
        else if (voucher.Discountamount is > 0)
        {
            discount = voucher.Discountamount.Value;
        }
        else
        {
            return Invalid("Voucher chưa được cấu hình mức giảm hợp lệ.", voucher, eligibleSubtotal);
        }

        discount = Math.Min(discount, eligibleSubtotal);
        if (discount <= 0)
            return Invalid("Voucher không tạo ra giá trị giảm hợp lệ cho giỏ hàng này.", voucher, eligibleSubtotal);

        return new VoucherEvaluation(true, null, voucher, eligibleSubtotal, discount);
    }

    private static VoucherEvaluation Invalid(
        string message,
        Voucher? voucher,
        decimal eligibleSubtotal = 0m) =>
        new(false, message, voucher, eligibleSubtotal, 0m);
}
