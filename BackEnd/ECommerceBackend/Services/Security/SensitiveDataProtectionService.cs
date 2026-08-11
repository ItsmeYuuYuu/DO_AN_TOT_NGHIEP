using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace ECommerceBackend.Services.Security;

public sealed record SensitiveDataMatch(
    string Kind,
    string Label,
    int Start,
    int Length,
    string Replacement);

public sealed record SensitiveDataSanitizationResult(
    string SanitizedText,
    IReadOnlyList<SensitiveDataMatch> Matches);

public interface ISensitiveDataProtectionService
{
    SensitiveDataSanitizationResult Sanitize(string text);
}

public sealed partial class SensitiveDataProtectionService : ISensitiveDataProtectionService
{
    public SensitiveDataSanitizationResult Sanitize(string text)
    {
        if (string.IsNullOrEmpty(text))
            return new SensitiveDataSanitizationResult(text, []);

        var matches = new List<SensitiveDataMatch>();
        foreach (Match candidate in NumberCandidateRegex().Matches(text))
        {
            var digits = NonDigitRegex().Replace(candidate.Value, string.Empty);
            var prefix = NormalizeContext(text[Math.Max(0, candidate.Index - 48)..candidate.Index]);
            var suffixStart = candidate.Index + candidate.Length;
            var suffix = NormalizeContext(text[suffixStart..Math.Min(text.Length, suffixStart + 48)]);
            var classification = Classify(digits, prefix, suffix);
            if (classification is null) continue;

            matches.Add(new SensitiveDataMatch(
                classification.Value.Kind,
                classification.Value.Label,
                candidate.Index,
                candidate.Length,
                classification.Value.Replacement));
        }

        if (matches.Count == 0)
            return new SensitiveDataSanitizationResult(text, matches);

        var result = new StringBuilder(text.Length);
        var cursor = 0;
        foreach (var match in matches)
        {
            result.Append(text, cursor, match.Start - cursor);
            result.Append(match.Replacement);
            cursor = match.Start + match.Length;
        }
        result.Append(text, cursor, text.Length - cursor);

        return new SensitiveDataSanitizationResult(result.ToString(), matches);
    }

    private static (string Kind, string Label, string Replacement)? Classify(string digits, string prefix, string suffix)
    {
        var phoneDistance = KeywordDistance(prefix, suffix, "so dien thoai", "dien thoai", "sdt", "phone", "lien he");
        var orderDistance = KeywordDistance(prefix, suffix, "ma don hang", "ma don", "don hang", "order");
        var cardSecurityDistance = KeywordDistance(prefix, suffix, "cvv", "cvc", "csc", "ma bao mat", "ma an toan");
        var bankAccountDistance = KeywordDistance(
            prefix,
            suffix,
            "so tai khoan",
            "tai khoan ngan hang",
            "bank account",
            "stk",
            "ngan hang");
        var cardDistance = KeywordDistance(
            prefix,
            suffix,
            "so the",
            "the ngan hang",
            "the tin dung",
            "the ghi no",
            "credit card",
            "debit card",
            "visa",
            "mastercard");
        var nationalIdDistance = KeywordDistance(
            prefix,
            suffix,
            "cccd",
            "cmnd",
            "can cuoc",
            "chung minh nhan dan",
            "so dinh danh");

        if (digits.Length == 10 && digits.StartsWith('0') && phoneDistance <= 12) return null;
        if (orderDistance <= 12) return null;

        var classifications = new List<(string Kind, string Label, string Replacement, int Distance)>();
        if (digits.Length is >= 3 and <= 4 && cardSecurityDistance <= 28)
            classifications.Add(("card-security-code", "Mã bảo mật thẻ (CVV/CVC)", new string('*', digits.Length), cardSecurityDistance));

        if (digits.Length is >= 6 and <= 20 && bankAccountDistance <= 28)
            classifications.Add(("bank-account", "Số tài khoản ngân hàng", new string('*', digits.Length), bankAccountDistance));

        if (digits.Length is >= 13 and <= 19 && (cardDistance <= 28 || PassesLuhn(digits)))
            classifications.Add(("payment-card", "Số thẻ thanh toán", new string('*', digits.Length), cardDistance <= 28 ? cardDistance : 40));

        if (digits.Length == 12 || (digits.Length == 9 && nationalIdDistance <= 28))
            classifications.Add(("national-id", digits.Length == 12 ? "Số căn cước công dân" : "Số chứng minh nhân dân", new string('*', digits.Length), nationalIdDistance <= 28 ? nationalIdDistance : 40));

        if (classifications.Count == 0) return null;
        var selected = classifications.OrderBy(item => item.Distance).First();
        return (selected.Kind, selected.Label, selected.Replacement);
    }

    private static int KeywordDistance(string prefix, string suffix, params string[] terms)
    {
        var best = int.MaxValue;
        foreach (var term in terms)
        {
            var prefixIndex = prefix.LastIndexOf(term, StringComparison.Ordinal);
            if (prefixIndex >= 0)
                best = Math.Min(best, prefix.Length - prefixIndex - term.Length);

            var suffixIndex = suffix.IndexOf(term, StringComparison.Ordinal);
            if (suffixIndex >= 0)
                best = Math.Min(best, suffixIndex + 8);
        }
        return best;
    }

    private static string NormalizeContext(string value)
    {
        var normalized = value.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);
        foreach (var character in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
                builder.Append(character is 'đ' or 'Đ' ? 'd' : char.ToLowerInvariant(character));
        }
        return builder.ToString().Normalize(NormalizationForm.FormC);
    }

    private static bool PassesLuhn(string digits)
    {
        var sum = 0;
        var doubleDigit = false;
        for (var index = digits.Length - 1; index >= 0; index--)
        {
            var digit = digits[index] - '0';
            if (doubleDigit)
            {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
            doubleDigit = !doubleDigit;
        }
        return sum > 0 && sum % 10 == 0;
    }

    [GeneratedRegex(@"\d(?:[\s.-]?\d){2,18}", RegexOptions.CultureInvariant)]
    private static partial Regex NumberCandidateRegex();

    [GeneratedRegex(@"\D", RegexOptions.CultureInvariant)]
    private static partial Regex NonDigitRegex();
}
