using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using ECommerceBackend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace ECommerceBackend.Services.Chat;

public sealed record ProductConsultationResult(
    int ProductId,
    int VariantId,
    string ProductName,
    string Brand,
    string Category,
    string Condition,
    string Sku,
    decimal Price,
    decimal BasePrice,
    int Stock,
    string ImageUrl,
    IReadOnlyDictionary<string, string> Specifications,
    string Description = "",
    string? ProductSlug = null);

public interface IProductConsultationService
{
    Task<IReadOnlyList<ProductConsultationResult>> SearchAsync(
        string userMessage,
        IReadOnlyCollection<int>? productIds = null,
        CancellationToken cancellationToken = default);
}

public sealed class ProductConsultationService : IProductConsultationService
{
    private static readonly string[] StopWords =
    {
        "toi", "minh", "ban", "cho", "can", "muon", "tim", "mua", "tu", "van",
        "san", "pham", "may", "nao", "co", "khong", "va", "voi", "la", "cua",
        "giup", "khoang", "tam", "duoi", "tren", "gia", "trieu", "nghin", "vnd"
    };

    private static readonly HashSet<string> GenericPhoneConsultationWords = new(StringComparer.Ordinal)
    {
        "toi", "minh", "em", "anh", "chi", "ban", "cho", "can", "muon", "mua", "tim", "tu", "van", "giup",
        "goi", "y", "vui", "long", "hay", "nen", "chon", "lay", "xem", "co", "khong", "la", "cua", "voi", "va",
        "mot", "vai", "cai", "chiec", "loai", "mau", "dong", "may", "san", "pham", "dien", "thoai", "smartphone", "phone",
        "nao", "gi", "phu", "hop", "tot", "dep", "muot", "manh", "ben", "on", "dinh", "ngon", "re", "xin", "nhat",
        "gia", "ngan", "sach", "tam", "khoang", "duoi", "tren", "tu", "den", "trieu", "nghin", "k", "vnd", "dong",
        "camera", "chup", "anh", "quay", "phim", "video", "tele", "zoom", "dem", "selfie", "chan", "dung", "ois",
        "choi", "game", "gaming", "genshin", "pubg", "lien", "quan", "free", "fire", "toc", "chien", "fps",
        "pin", "lau", "trau", "sac", "nhanh", "hieu", "nang", "cau", "hinh", "chip", "cpu", "gpu",
        "ram", "rom", "bo", "nho", "dung", "luong", "gb", "tb", "man", "hinh", "oled", "amoled", "hz",
        "hoc", "tap", "sinh", "vien", "van", "phong", "lam", "viec", "mang", "xa", "hoi", "livestream",
        "moi", "new", "seal", "likenew", "cu", "con", "hang", "ton", "kho", "chinh", "hang",
        "so", "sanh", "khac", "nhau", "hon", "doi", "chieu", "uu", "tien", "theo", "thuong", "hieu"
    };

    private static readonly HashSet<string> GenericCatalogTermWords = new(StringComparer.Ordinal)
    {
        "dien", "thoai", "smartphone", "phone", "mobile", "may", "san", "pham", "dong", "series", "model"
    };

    private static readonly HashSet<string> GenericModelQualifierWords = new(StringComparer.Ordinal)
    {
        "pro", "max", "plus", "ultra", "mini", "lite", "air", "fe", "se",
        "new", "seal", "likenew", "phone", "smartphone", "mobile", "series",
        "5g", "4g", "3g"
    };

    private readonly ECommerceContext _context;
    private readonly AiAssistantOptions _options;

    public ProductConsultationService(
        ECommerceContext context,
        IOptions<AiAssistantOptions> options)
    {
        _context = context;
        _options = options.Value;
    }

    public async Task<IReadOnlyList<ProductConsultationResult>> SearchAsync(
        string userMessage,
        IReadOnlyCollection<int>? productIds = null,
        CancellationToken cancellationToken = default)
    {
        var normalizedQuery = Normalize(userMessage);
        var priceRange = ExtractPriceRange(normalizedQuery);
        var requiresStock = ContainsAny(normalizedQuery, "con hang", "san hang", "ton kho", "mua ngay");
        var requestedRam = ExtractCapacity(normalizedQuery, "ram");
        var requestedStorage = ExtractStorage(normalizedQuery);
        var usageProfile = DetectUsageProfile(normalizedQuery);

        // Nhận diện các thương hiệu được đề cập trong truy vấn của người dùng
        var dbBrands = await _context.Brands.AsNoTracking().ToListAsync(cancellationToken);
        var brandSynonyms = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
        {
            { "Google Pixel", new[] { "google", "pixel" } },
            { "ASUS ROG", new[] { "asus", "rog", "rog phone" } },
            { "Nothing Phone", new[] { "nothing" } },
            { "REDMAGIC", new[] { "red magic", "redmagic" } }
        };

        var mentionedBrands = dbBrands
            .Where(b => {
                var normalizedBrand = Normalize(b.Brandname);
                if (Regex.IsMatch(normalizedQuery, $@"\b{Regex.Escape(normalizedBrand)}\b", RegexOptions.IgnoreCase))
                {
                    return true;
                }
                if (brandSynonyms.TryGetValue(b.Brandname, out var synonyms))
                {
                    foreach (var synonym in synonyms)
                    {
                        var normalizedSynonym = Normalize(synonym);
                        if (Regex.IsMatch(normalizedQuery, $@"\b{Regex.Escape(normalizedSynonym)}\b", RegexOptions.IgnoreCase))
                        {
                            return true;
                        }
                    }
                }
                return false;
            })
            .ToList();

        var productQuery = _context.Products
            .AsNoTracking()
            .Where(product => product.Isactive)
            .Include(product => product.Brand)
            .Include(product => product.Category)
            .Include(product => product.Productvariants)
                .ThenInclude(variant => variant.Inventoryitems)
            .AsSplitQuery();

        if (mentionedBrands.Count > 0)
        {
            var brandIds = mentionedBrands.Select(b => b.Brandid).ToList();
            productQuery = productQuery.Where(product => product.Brandid.HasValue && brandIds.Contains(product.Brandid.Value));
        }

        if (productIds is { Count: > 0 })
        {
            productQuery = productQuery.Where(product =>
                productIds.Contains(product.Productid));
        }

        var products = await productQuery
            .OrderByDescending(product => product.Createdat)
            .Take(250)
            .ToListAsync(cancellationToken);

        var catalogTerms = products
            .SelectMany(product => new[]
            {
                product.Productname,
                product.Brand?.Brandname,
                product.Category?.Categoryname,
                product.Seriesname
            })
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => Normalize(value!))
            .Distinct()
            .ToList();

        if (!IsCatalogIntent(normalizedQuery, catalogTerms))
        {
            return Array.Empty<ProductConsultationResult>();
        }

        var queryTokens = Regex.Matches(normalizedQuery, @"[\p{L}\p{N}]+")
            .Select(match => match.Value)
            .Where(token =>
                (token.Length >= 2 || token.All(char.IsDigit)) &&
                !StopWords.Contains(token))
            .Distinct()
            .ToArray();

        var candidates = new List<(ProductConsultationResult Result, int Score)>();
        foreach (var product in products)
        {
            foreach (var variant in product.Productvariants)
            {
                var price = variant.Saleprice ?? variant.Baseprice;
                if (priceRange.Min.HasValue && price < priceRange.Min.Value)
                    continue;
                if (priceRange.Max.HasValue && price > priceRange.Max.Value)
                    continue;

                var stock = variant.Inventoryitems.Count(item => item.Status == "InStock");
                if (requiresStock && stock == 0)
                    continue;

                var specifications = ParseSpecifications(variant.Specifications);
                var searchableText = Normalize(string.Join(" ", new[]
                {
                    product.Productname,
                    product.Brand?.Brandname,
                    product.Category?.Categoryname,
                    product.Seriesname,
                    product.Description,
                    variant.Condition,
                    variant.Sku,
                    string.Join(" ", specifications.Select(item => $"{item.Key} {item.Value}"))
                }));

                if (!MatchesCapacity(searchableText, requestedRam, "ram"))
                    continue;
                if (!MatchesStorage(searchableText, requestedStorage))
                    continue;

                var score = queryTokens.Sum(token => searchableText.Contains(token) ? 3 : 0);
                var productNameTokens = Regex.Matches(
                        Normalize(product.Productname),
                        @"[\p{L}\p{N}]+")
                    .Select(match => match.Value)
                    .Where(token =>
                        (token.Length >= 2 || token.All(char.IsDigit)) &&
                        !StopWords.Contains(token))
                    .Distinct()
                    .ToArray();
                if (productNameTokens.Length > 0 &&
                    productNameTokens.All(normalizedQuery.Contains))
                {
                    score += 20 + productNameTokens.Length;
                }
                if (Normalize(product.Productname).Contains(normalizedQuery))
                    score += 12;
                if (!string.IsNullOrWhiteSpace(product.Brand?.Brandname) &&
                    normalizedQuery.Contains(Normalize(product.Brand.Brandname)))
                    score += 8;
                if (!string.IsNullOrWhiteSpace(product.Seriesname) &&
                    normalizedQuery.Contains(Normalize(product.Seriesname)))
                    score += 10;
                if (stock > 0)
                    score += 2;
                if (variant.Saleprice.HasValue && variant.Saleprice < variant.Baseprice)
                    score += 1;
                score += ScoreUsageProfile(searchableText, specifications, usageProfile);

                if (queryTokens.Length > 0 && score == 0 &&
                    !priceRange.Min.HasValue && !priceRange.Max.HasValue)
                    continue;

                candidates.Add((
                    new ProductConsultationResult(
                        product.Productid,
                        variant.Variantid,
                        product.Productname,
                        product.Brand?.Brandname ?? "Chưa xác định",
                        product.Category?.Categoryname ?? "Chưa xác định",
                        variant.Condition,
                        variant.Sku ?? string.Empty,
                        price,
                        variant.Baseprice,
                        stock,
                        ExtractFirstImage(variant.Imageurls),
                        specifications,
                        product.Description ?? string.Empty,
                        product.Slug),
                    score));
            }
        }

        var rankedCandidates = candidates
            .OrderByDescending(candidate => candidate.Score)
            .ThenByDescending(candidate => candidate.Result.Stock > 0)
            .ThenBy(candidate => candidate.Result.Price)
            .Select(candidate => candidate.Result)
            .ToList();

        return RestrictToNamedModelMatches(normalizedQuery, rankedCandidates)
            .Take(Math.Clamp(_options.MaxRetrievedVariants, 1, 10))
            .ToList();
    }

    internal static IReadOnlyList<ProductConsultationResult> RestrictToNamedModelMatches(
        string userMessage,
        IReadOnlyList<ProductConsultationResult> products)
    {
        if (products.Count == 0)
            return products;

        var normalizedQuery = Normalize(userMessage);
        var exactProductIds = products
            .Where(product => IsExactProductNameMatch(normalizedQuery, product))
            .Select(product => product.ProductId)
            .ToHashSet();
        if (exactProductIds.Count > 0)
        {
            return products
                .Where(product => exactProductIds.Contains(product.ProductId))
                .ToList();
        }

        if (!TryGetRequestedModelFamily(normalizedQuery, products, out var requestedFamily))
            return products;

        var familyProductIds = products
            .Where(product => GetModelFamilyTokens(product).Contains(requestedFamily))
            .Select(product => product.ProductId)
            .ToHashSet();
        return familyProductIds.Count == 0
            ? products
            : products
                .Where(product => familyProductIds.Contains(product.ProductId))
                .ToList();
    }

    internal static bool TryGetSpecificModelFallbackFamily(
        string userMessage,
        IReadOnlyList<ProductConsultationResult> products,
        out string family)
    {
        family = string.Empty;
        if (products.Count == 0)
            return false;

        var normalizedQuery = Normalize(userMessage);
        if (!Regex.IsMatch(normalizedQuery, @"\d") ||
            products.Any(product => IsExactProductNameMatch(normalizedQuery, product)))
        {
            return false;
        }

        return TryGetRequestedModelFamily(normalizedQuery, products, out family);
    }

    private static bool IsExactProductNameMatch(
        string normalizedQuery,
        ProductConsultationResult product)
    {
        var compactQuery = CompactAlphaNumeric(normalizedQuery);
        var normalizedProductName = Normalize(product.ProductName);
        var compactFullName = CompactAlphaNumeric(normalizedProductName);
        if (compactFullName.Length >= 4 &&
            compactQuery.Contains(compactFullName, StringComparison.Ordinal))
        {
            return true;
        }

        var normalizedBrand = Normalize(product.Brand);
        var modelName = Regex.Replace(
            normalizedProductName,
            $@"\b{Regex.Escape(normalizedBrand)}\b",
            " ",
            RegexOptions.IgnoreCase);
        var compactModelName = CompactAlphaNumeric(modelName);
        return compactModelName.Length >= 4 &&
               compactQuery.Contains(compactModelName, StringComparison.Ordinal);
    }

    private static bool TryGetRequestedModelFamily(
        string normalizedQuery,
        IReadOnlyList<ProductConsultationResult> products,
        out string family)
    {
        family = string.Empty;
        var queryTokens = SplitAlphaNumericTokens(normalizedQuery).ToHashSet(StringComparer.Ordinal);
        var familyFrequency = products
            .GroupBy(product => product.ProductId)
            .Select(group => group.First())
            .SelectMany(product => GetModelFamilyTokens(product).Distinct())
            .Where(queryTokens.Contains)
            .GroupBy(token => token, StringComparer.Ordinal)
            .Select(group => new
            {
                Token = group.Key,
                ProductCount = group.Count()
            })
            .OrderBy(item => item.ProductCount)
            .ThenByDescending(item => item.Token.Length)
            .FirstOrDefault();
        if (familyFrequency == null)
            return false;

        family = familyFrequency.Token;
        return true;
    }

    private static HashSet<string> GetModelFamilyTokens(ProductConsultationResult product)
    {
        var nameTokens = SplitAlphaNumericTokens(Normalize(product.ProductName))
            .Where(token => token.All(char.IsLetter))
            .ToList();
        var brandTokens = SplitAlphaNumericTokens(Normalize(product.Brand))
            .Where(token => token.All(char.IsLetter))
            .ToList();
        var familyTokens = nameTokens
            .Where(token =>
                token.Length >= 3 &&
                !brandTokens.Contains(token) &&
                !GenericModelQualifierWords.Contains(token))
            .ToHashSet(StringComparer.Ordinal);

        // Multi-word brands such as Google Pixel use the final brand word as the model family.
        // iPhone is both the brand-facing name and the recognizable product family.
        if (familyTokens.Count == 0 &&
            (brandTokens.Count > 1 || brandTokens.Contains("iphone")))
        {
            var fallback = brandTokens.LastOrDefault(token =>
                token.Length >= 3 && !GenericModelQualifierWords.Contains(token));
            if (!string.IsNullOrWhiteSpace(fallback))
                familyTokens.Add(fallback);
        }

        return familyTokens;
    }

    private static IEnumerable<string> SplitAlphaNumericTokens(string value) =>
        Regex.Matches(value, @"[\p{L}]+|\p{N}+")
            .Select(match => match.Value);

    private static string CompactAlphaNumeric(string value) =>
        string.Concat(SplitAlphaNumericTokens(value));

    internal static string Normalize(string value)
    {
        var decomposed = value.ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposed.Length);
        foreach (var character in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
            {
                builder.Append(character == 'đ' ? 'd' : character);
            }
        }

        return Regex.Replace(builder.ToString(), @"\s+", " ").Trim();
    }

    private static bool IsCatalogIntent(string query, IReadOnlyCollection<string> catalogTerms)
    {
        if (CatalogScopeGuard.Check(query).IsOutOfScope)
            return false;

        if (catalogTerms.Any(term => MatchesCatalogTerm(query, term)))
            return true;

        if (ContainsAny(query, "dien thoai", "smartphone", "smart phone", "mobile phone", "iphone"))
            return true;

        var hasConsultationSignal = ContainsAny(
            query, "san pham", "may nao", "tim may", "chon may", "goi y", "tu van", "mua",
            "gia", "ram", "bo nho", "so sanh", "camera", "pin", "chup anh", "quay video",
            "choi game", "gaming", "hieu nang", "cau hinh", "hoc tap", "lam viec");
        if (!hasConsultationSignal)
            return false;

        // Generic phone requests are accepted only when every meaningful word belongs to the
        // consultation vocabulary. An unknown target noun therefore cannot borrow “camera/pin/game”
        // to receive unrelated phone results. Real brand/product/series names were accepted above.
        return Regex.Matches(query, @"[\p{L}\p{N}]+")
            .Select(match => match.Value)
            .All(token =>
                token.All(char.IsDigit) ||
                token.Length == 1 ||
                GenericPhoneConsultationWords.Contains(token));
    }

    private static bool MatchesCatalogTerm(string query, string catalogTerm)
    {
        if (catalogTerm.Length >= 3 && query.Contains(catalogTerm, StringComparison.Ordinal))
            return true;

        var splitQueryTokens = SplitAlphaNumericTokens(query)
            .ToHashSet(StringComparer.Ordinal);
        var splitCatalogTokens = SplitAlphaNumericTokens(catalogTerm);
        var hasSharedModelFamily = splitCatalogTokens.Any(token =>
            token.Length >= 4 &&
            token.Any(char.IsLetter) &&
            !GenericCatalogTermWords.Contains(token) &&
            !GenericModelQualifierWords.Contains(token) &&
            splitQueryTokens.Contains(token));
        var queryHasGeneration = splitQueryTokens.Any(token => token.All(char.IsDigit));
        var catalogHasGeneration = splitCatalogTokens.Any(token => token.All(char.IsDigit));

        if (hasSharedModelFamily && queryHasGeneration && catalogHasGeneration)
            return true;

        var queryTokens = Regex.Matches(query, @"[\p{L}\p{N}]+")
            .Select(match => match.Value)
            .ToHashSet(StringComparer.Ordinal);
        var distinctiveTokens = Regex.Matches(catalogTerm, @"[\p{L}\p{N}]+")
            .Select(match => match.Value)
            .Where(token => token.Length >= 2 && !GenericCatalogTermWords.Contains(token))
            .Distinct(StringComparer.Ordinal)
            .ToList();
        var matches = distinctiveTokens.Count(queryTokens.Contains);

        if (distinctiveTokens.Count >= 2)
            return matches >= 2;
        return distinctiveTokens.Count == 1 && matches == 1 &&
            (distinctiveTokens[0].Length >= 5 || distinctiveTokens[0].Any(char.IsDigit));
    }

    private static (decimal? Min, decimal? Max) ExtractPriceRange(string query)
    {
        var rangeMatch = Regex.Match(
            query,
            @"(?:tu\s+)?(?<min>\d+(?:[.,]\d+)?)\s*(?<minUnit>trieu|tr|nghin|ngan|k)?\s*(?:den|-)\s*(?<max>\d+(?:[.,]\d+)?)\s*(?<maxUnit>trieu|tr|nghin|ngan|k)");
        if (rangeMatch.Success)
        {
            var max = ToCurrency(rangeMatch.Groups["max"].Value, rangeMatch.Groups["maxUnit"].Value);
            var minUnit = rangeMatch.Groups["minUnit"].Success
                ? rangeMatch.Groups["minUnit"].Value
                : rangeMatch.Groups["maxUnit"].Value;
            return (ToCurrency(rangeMatch.Groups["min"].Value, minUnit), max);
        }

        var amountMatch = Regex.Match(
            query,
            @"(?<amount>\d+(?:[.,]\d+)?)\s*(?<unit>trieu|tr|nghin|ngan|k|vnd|dong)");
        if (!amountMatch.Success)
            return (null, null);

        var amount = ToCurrency(amountMatch.Groups["amount"].Value, amountMatch.Groups["unit"].Value);
        if (ContainsAny(query, "tren", "it nhat", "toi thieu"))
            return (amount, null);

        return (null, amount);
    }

    private static decimal ToCurrency(string rawAmount, string unit)
    {
        var normalizedAmount = rawAmount.Replace(',', '.');
        var amount = decimal.TryParse(
            normalizedAmount,
            NumberStyles.Number,
            CultureInfo.InvariantCulture,
            out var parsed)
            ? parsed
            : 0;

        return unit switch
        {
            "trieu" or "tr" => amount * 1_000_000,
            "nghin" or "ngan" or "k" => amount * 1_000,
            _ => amount
        };
    }

    private static int? ExtractCapacity(string query, string label)
    {
        var match = Regex.Match(query, $@"{label}\s*(?<value>\d+)\s*gb");
        return match.Success && int.TryParse(match.Groups["value"].Value, out var value)
            ? value
            : null;
    }

    private static string? ExtractStorage(string query)
    {
        var match = Regex.Match(
            query,
            @"(?:bo nho|dung luong|rom)\s*(?<value>\d+)\s*(?<unit>gb|tb)");
        return match.Success
            ? $"{match.Groups["value"].Value}{match.Groups["unit"].Value}"
            : null;
    }

    private static bool MatchesCapacity(string searchableText, int? capacity, string label)
    {
        if (!capacity.HasValue)
            return true;

        return Regex.IsMatch(
            searchableText,
            $@"(?:{label}\s*[:\-]?\s*{capacity.Value}\s*gb|{capacity.Value}\s*gb\s*{label})");
    }

    private static bool MatchesStorage(string searchableText, string? storage)
    {
        if (string.IsNullOrWhiteSpace(storage))
            return true;

        return searchableText.Contains(storage) &&
               ContainsAny(searchableText, "bo nho", "dung luong", "rom", "storage");
    }

    private static string? DetectUsageProfile(string query)
    {
        if (ContainsAny(
                query,
                "choi game",
                "gaming",
                "game nang",
                "fps",
                "moba",
                "hieu nang",
                "cau hinh manh"))
            return "gaming";
        if (ContainsAny(
                query,
                "chup anh",
                "chup hinh",
                "quay phim",
                "quay video",
                "camera",
                "song ao",
                "zoom"))
            return "camera";
        if (ContainsAny(
                query,
                "pin",
                "dung lau",
                "sac nhanh",
                "thoi luong pin"))
            return "battery";
        if (ContainsAny(query, "hoc tap", "sinh vien", "van phong", "hoc online", "lam viec"))
            return "study";
        return null;
    }

    private static int ScoreUsageProfile(
        string searchableText,
        IReadOnlyDictionary<string, string> specifications,
        string? usageProfile)
    {
        if (string.IsNullOrEmpty(usageProfile))
            return 0;

        var specificationText = Normalize(string.Join(
            " ",
            specifications.Select(item => $"{item.Key} {item.Value}")));
        var text = $"{searchableText} {specificationText}";
        return usageProfile switch
        {
            "gaming" => ScoreTerms(
                text,
                ("choi game", 10),
                ("gaming", 10),
                ("snapdragon 8 elite gen 5", 14),
                ("snapdragon 8 elite", 12),
                ("snapdragon 8 gen 4", 11),
                ("snapdragon 8 gen 3", 10),
                ("snapdragon 8 gen 2", 8),
                ("snapdragon 8", 7),
                ("dimensity 9400", 11),
                ("dimensity 9300", 10),
                ("dimensity 9200", 8),
                ("dimensity 9", 6),
                ("apple a18", 11),
                ("apple a17", 10),
                ("a18 pro", 12),
                ("a17 pro", 11),
                ("chipset", 5),
                ("gpu", 5),
                ("ram", 4),
                ("tan nhiet", 4),
                ("active fan", 5),
                ("liquid cooling", 5),
                ("airtriggers", 5),
                ("shoulder triggers", 5),
                ("185hz", 6),
                ("165hz", 6),
                ("144hz", 5),
                ("120hz", 2),
                ("pin", 2)),
            "camera" => ScoreTerms(
                text,
                ("zeiss", 10),
                ("leica", 10),
                ("hasselblad", 10),
                ("periscope", 7),
                ("tele", 5),
                ("telephoto", 5),
                ("sony imx", 6),
                ("ois", 6),
                ("chong rung", 5),
                ("200mp", 4),
                ("camera sau", 6),
                ("quay video", 5),
                ("zoom", 3),
                ("camera truoc", 2)),
            "battery" => ScoreTerms(
                text,
                ("7500mah", 10),
                ("7300mah", 9),
                ("7000mah", 9),
                ("6150mah", 8),
                ("6100mah", 8),
                ("6000mah", 7),
                ("5910mah", 6),
                ("5850mah", 6),
                ("5600mah", 5),
                ("5500mah", 5),
                ("sac nhanh 120w", 6),
                ("sac nhanh 100w", 5),
                ("pin", 6),
                ("mah", 5),
                ("sac nhanh", 5),
                ("cong nghe sac", 4),
                ("usb-c", 2)),
            "study" => ScoreTerms(
                text,
                ("pin", 4),
                ("trong luong", 4),
                ("man hinh", 3),
                ("ram", 3),
                ("wifi", 2)),
            _ => 0
        };
    }

    internal static int ScoreForUsageProfile(
        ProductConsultationResult product,
        string usageProfile)
    {
        var searchableText = Normalize(string.Join(" ", new[]
        {
            product.ProductName,
            product.Brand,
            product.Description,
            product.Condition,
            string.Join(
                " ",
                product.Specifications.Select(item => $"{item.Key} {item.Value}"))
        }));
        return ScoreUsageProfile(
            searchableText,
            product.Specifications,
            usageProfile);
    }

    private static int ScoreTerms(string text, params (string Term, int Score)[] terms) =>
        terms.Sum(item => text.Contains(item.Term) ? item.Score : 0);

    private static IReadOnlyDictionary<string, string> ParseSpecifications(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return new Dictionary<string, string>();

        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, string>>(json)
                   ?? new Dictionary<string, string>();
        }
        catch (JsonException)
        {
            return new Dictionary<string, string>();
        }
    }

    private static bool ContainsAny(string value, params string[] terms) =>
        terms.Any(value.Contains);
    private static string ExtractFirstImage(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return string.Empty;
        try
        {
            var urls = JsonSerializer.Deserialize<List<string>>(json);
            return urls?.FirstOrDefault() ?? string.Empty;
        }
        catch { return string.Empty; }
    }
}

