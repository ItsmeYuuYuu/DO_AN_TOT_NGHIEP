using System.Text.RegularExpressions;

namespace ECommerceBackend.Services.Chat;

public sealed record CatalogScopeDecision(bool IsOutOfScope, string? MatchedTerm = null);

/// <summary>
/// Deterministic safety gate for the phone catalog. This runs before retrieval and the LLM,
/// so an out-of-domain noun can never be converted into phone recommendations by usage words.
/// </summary>
public static class CatalogScopeGuard
{
    private static readonly string[] PhoneTerms =
    {
        "dien thoai", "smartphone", "smart phone", "mobile phone", "iphone",
        "samsung", "xiaomi", "redmi", "poco", "google pixel", "pixel",
        "oppo", "vivo", "iqoo", "honor", "oneplus", "realme", "sony xperia",
        "huawei", "nokia", "rog phone", "redmagic", "nothing phone"
    };

    private static readonly string[] UnsupportedProductTerms =
    {
        // Wearables, audio and other electronics
        "dong ho", "smartwatch", "smart watch", "vong deo tay", "loa", "ampli",
        "tai nghe", "micro", "tivi", "tv", "may chieu", "camera hanh trinh",
        "may anh", "laptop", "may tinh", "pc", "desktop", "macbook", "tablet", "ipad",
        "playstation", "xbox", "nintendo",

        // Home appliances and furniture
        "tu lanh", "may giat", "may say", "may lanh", "dieu hoa", "quat",
        "noi com", "noi chien", "bep", "lo vi song", "may hut bui", "robot hut bui",
        "may loc nuoc", "binh nong lanh", "ban ghe", "cai ban", "cai ghe", "giuong", "tu quan ao",

        // Vehicles, fashion, food, health and other retail domains
        "o to", "xe hoi", "xe may", "xe dap", "giay", "dep", "ao", "quan", "tui xach",
        "my pham", "nuoc hoa", "son moi", "do an", "thuc pham", "banh", "sua", "thuoc",
        "sach", "truyen", "do choi", "bat dong san", "ve may bay", "khach san",

        // Financial/off-topic objects which contain shopping words such as “giá”
        "gia vang", "co phieu", "chung khoan", "bitcoin", "tien ao", "tien dien tu"
    };

    public static CatalogScopeDecision Check(string message)
    {
        var normalized = ProductConsultationService.Normalize(message);
        var phoneIndex = FirstTermIndex(normalized, PhoneTerms);
        var comparison = ContainsAny(normalized, "so sanh", "doi chieu", "khac nhau", "voi cai", "voi chiec");

        foreach (var term in UnsupportedProductTerms.OrderByDescending(value => value.Length))
        {
            var unsupportedIndex = TermIndex(normalized, term);
            if (unsupportedIndex < 0) continue;

            // “Điện thoại có loa tốt” is about a phone component. “Mua loa kết nối điện thoại”
            // and cross-domain comparisons remain outside the supported catalog.
            var phoneIsClearlyTheSubject = phoneIndex >= 0 && phoneIndex < unsupportedIndex && !comparison;
            if (!phoneIsClearlyTheSubject)
                return new CatalogScopeDecision(true, term);
        }

        return new CatalogScopeDecision(false);
    }

    private static int FirstTermIndex(string text, IEnumerable<string> terms) =>
        terms.Select(term => TermIndex(text, term)).Where(index => index >= 0).DefaultIfEmpty(-1).Min();

    private static int TermIndex(string text, string term)
    {
        var match = Regex.Match(text, $@"(?<![\p{{L}}\p{{N}}]){Regex.Escape(term)}(?![\p{{L}}\p{{N}}])");
        return match.Success ? match.Index : -1;
    }

    private static bool ContainsAny(string value, params string[] terms) =>
        terms.Any(term => value.Contains(term, StringComparison.Ordinal));
}
