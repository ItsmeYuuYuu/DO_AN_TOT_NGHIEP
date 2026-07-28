using System.Globalization;
using System.Text;

namespace ECommerceBackend.Services.Checkout;

public interface IShippingFeePolicy
{
    ShippingFeeQuote Calculate(decimal merchandiseAmount, string? provinceName, string? wardName);
}

public sealed record ShippingFeeQuote(decimal Fee, string Zone);

public sealed class ShippingFeePolicy : IShippingFeePolicy
{
    public const decimal FreeShippingThreshold = 2_000_000m;
    public const decimal HoChiMinhInnerFee = 30_000m;
    public const decimal StandardFee = 50_000m;

    private static readonly string[] OuterHoChiMinhAreaTokens =
    [
        "cu chi", "hoc mon", "binh chanh", "nha be", "can gio",
        "an nhon tay", "nhuan duc", "phu hoa dong", "tan an hoi", "thai my",
        "ba diem", "dong thanh", "xuan thoi son",
        "binh hung", "binh loi", "hung long", "tan nhut", "vinh loc",
        "hiep phuoc", "binh khanh", "an thoi dong", "thanh an",
        "thu dau mot", "di an", "thuan an", "ben cat", "tan uyen",
        "ba ria", "vung tau", "phu my", "long hai", "ho tram", "con dao"
    ];

    public ShippingFeeQuote Calculate(decimal merchandiseAmount, string? provinceName, string? wardName)
    {
        if (merchandiseAmount >= FreeShippingThreshold)
            return new ShippingFeeQuote(0m, "Free");

        var province = Normalize(provinceName);
        var ward = Normalize(wardName);
        if (!province.Contains("ho chi minh", StringComparison.Ordinal))
            return new ShippingFeeQuote(StandardFee, "OutsideHoChiMinhCity");

        var isOuterArea = OuterHoChiMinhAreaTokens.Any(token =>
            ward.Contains(token, StringComparison.Ordinal));

        return isOuterArea
            ? new ShippingFeeQuote(StandardFee, "HoChiMinhOuter")
            : new ShippingFeeQuote(HoChiMinhInnerFee, "HoChiMinhInner");
    }

    private static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;

        var normalized = value.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);
        foreach (var character in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
                builder.Append(character);
        }

        return builder
            .ToString()
            .Normalize(NormalizationForm.FormC)
            .Replace('\u0111', 'd')
            .Replace('\u0110', 'D')
            .ToLowerInvariant()
            .Trim();
    }
}
