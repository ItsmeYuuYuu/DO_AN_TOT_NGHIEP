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
    IReadOnlyDictionary<string, string> Specifications);

public interface IProductConsultationService
{
    Task<IReadOnlyList<ProductConsultationResult>> SearchAsync(
        string userMessage,
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
        CancellationToken cancellationToken = default)
    {
        var normalizedQuery = Normalize(userMessage);
        var priceRange = ExtractPriceRange(normalizedQuery);
        var requiresStock = ContainsAny(normalizedQuery, "con hang", "san hang", "ton kho", "mua ngay");
        var requestedRam = ExtractCapacity(normalizedQuery, "ram");
        var requestedStorage = ExtractStorage(normalizedQuery);

        var products = await _context.Products
            .AsNoTracking()
            .Include(product => product.Brand)
            .Include(product => product.Category)
            .Include(product => product.Productvariants)
                .ThenInclude(variant => variant.Inventoryitems)
            .AsSplitQuery()
            .OrderByDescending(product => product.Createdat)
            .Take(250)
            .ToListAsync(cancellationToken);

        var catalogTerms = products
            .SelectMany(product => new[]
            {
                product.Productname,
                product.Brand?.Brandname,
                product.Category?.Categoryname
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
            .Where(token => token.Length >= 2 && !StopWords.Contains(token))
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
                if (Normalize(product.Productname).Contains(normalizedQuery))
                    score += 12;
                if (!string.IsNullOrWhiteSpace(product.Brand?.Brandname) &&
                    normalizedQuery.Contains(Normalize(product.Brand.Brandname)))
                    score += 8;
                if (stock > 0)
                    score += 2;
                if (variant.Saleprice.HasValue && variant.Saleprice < variant.Baseprice)
                    score += 1;

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
                        specifications),
                    score));
            }
        }

        return candidates
            .OrderByDescending(candidate => candidate.Score)
            .ThenByDescending(candidate => candidate.Result.Stock > 0)
            .ThenBy(candidate => candidate.Result.Price)
            .Take(Math.Clamp(_options.MaxRetrievedVariants, 1, 10))
            .Select(candidate => candidate.Result)
            .ToList();
    }

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
        if (ContainsAny(
                query,
                "san pham",
                "dien thoai",
                "laptop",
                "tablet",
                "tai nghe",
                "dong ho",
                "phu kien",
                "gia",
                "ram",
                "bo nho",
                "dung luong",
                "con hang",
                "ton kho",
                "so sanh",
                "mua",
                "camera",
                "pin"))
        {
            return true;
        }

        return catalogTerms.Any(term => term.Length >= 3 && query.Contains(term));
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
}
