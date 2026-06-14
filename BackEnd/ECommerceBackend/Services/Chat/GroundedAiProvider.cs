using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;

namespace ECommerceBackend.Services.Chat;

public sealed class GroundedAiProvider : IAiProvider
{
    private const int MaxDisplayedProducts = 3;
    private const int MaxDisplayedVariantsPerProduct = 2;
    private static readonly string[] BudgetQuickReplies =
    {
        "Dưới 10 triệu",
        "Từ 10 đến 20 triệu",
        "Từ 20 đến 30 triệu",
        "Trên 30 triệu"
    };
    private static readonly string[] UsageQuickReplies =
    {
        "Chơi game",
        "Chụp ảnh, quay video",
        "Pin lâu",
        "Học tập, làm việc"
    };
    private static readonly string[] ComparisonQuickReplies =
    {
        "Ưu tiên camera",
        "Ưu tiên hiệu năng",
        "Ưu tiên pin",
        "Chọn máy giá tốt nhất"
    };

    private readonly IProductConsultationService _productConsultation;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly AiAssistantOptions _options;
    private readonly ILogger<GroundedAiProvider> _logger;

    public GroundedAiProvider(
        IProductConsultationService productConsultation,
        IHttpClientFactory httpClientFactory,
        IOptions<AiAssistantOptions> options,
        ILogger<GroundedAiProvider> logger)
    {
        _productConsultation = productConsultation;
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<AiAssistantResponse> GetResponseAsync(
        AiConversationRequest request,
        CancellationToken cancellationToken = default)
    {
        var clarification = GetClarification(request);
        if (clarification != null)
        {
            return new AiAssistantResponse(
                clarification.Text,
                Array.Empty<ProductConsultationResult>(),
                ChatResponseTypes.Clarification,
                clarification.QuickReplies);
        }

        var comparisonRequested = IsComparisonRequest(request.UserMessage);
        var referentialComparison = comparisonRequested &&
            IsReferentialComparison(request.UserMessage);
        var scopedProductIds = GetScopedProductIds(request);
        var useConversationContext =
            scopedProductIds.Count == 0 &&
            (referentialComparison || ShouldUseConversationContext(request));
        var retrievalQuery = useConversationContext
            ? string.Join(
                " ",
                request.History
                    .Where(message =>
                        message.Role == "user" ||
                        message.ResponseType is
                            ChatResponseTypes.Comparison or
                            ChatResponseTypes.Recommendation)
                    .TakeLast(4)
                    .Select(message => message.Content)
                    .Append(request.UserMessage))
            : request.UserMessage;
        var products = await _productConsultation.SearchAsync(
            retrievalQuery,
            scopedProductIds,
            cancellationToken);
        products = RestrictToComparedProducts(request, products);

        if (products.Count == 0)
        {
            return new AiAssistantResponse(
                BuildCatalogResponse(request.UserMessage, products),
                Array.Empty<ProductConsultationResult>(),
                ChatResponseTypes.Text,
                new[] { "Điện thoại dưới 15 triệu", "Máy chơi game", "Máy chụp ảnh đẹp" });
        }

        if (_options.UseLanguageModel && !comparisonRequested)
        {
            try
            {
                var selectedVariantIds = await GetLanguageModelSelectionAsync(
                    request,
                    products,
                    cancellationToken);
                if (selectedVariantIds.Count > 0)
                {
                    var selectedProducts = selectedVariantIds
                        .Select(variantId =>
                            products.FirstOrDefault(product => product.VariantId == variantId))
                        .Where(product => product != null)
                        .Cast<ProductConsultationResult>()
                        .DistinctBy(product => product.VariantId)
                        .ToList();
                    if (selectedProducts.Count > 0)
                    {
                        var rankedProducts = comparisonRequested
                            ? selectedProducts
                                .Concat(products)
                                .DistinctBy(product => product.VariantId)
                                .ToList()
                            : selectedProducts;
                        var displayedProducts = SelectDisplayedVariants(
                            rankedProducts,
                            comparisonRequested);
                        return BuildProductResponse(
                            request.UserMessage,
                            displayedProducts,
                            comparisonRequested,
                            scopedProductIds.Count > 0);
                    }
                }

                _logger.LogWarning(
                    "Language model did not return valid variant IDs. Falling back to catalog ranking.");
            }
            catch (Exception exception)
            {
                _logger.LogWarning(
                    exception,
                    "Language model request failed. Falling back to grounded catalog response.");
            }
        }

        var displayedFallback = SelectDisplayedVariants(products, comparisonRequested);
        return BuildProductResponse(
            request.UserMessage,
            displayedFallback,
            comparisonRequested,
            scopedProductIds.Count > 0);
    }

    private static IReadOnlyList<ProductConsultationResult> SelectDisplayedVariants(
        IReadOnlyList<ProductConsultationResult> products,
        bool comparison)
    {
        var groups = products
            .GroupBy(product => product.ProductId)
            .Take(MaxDisplayedProducts);
        return comparison
            ? groups.Select(group => group.First()).ToList()
            : groups
                .SelectMany(group => group.Take(MaxDisplayedVariantsPerProduct))
                .ToList();
    }

    private static AiAssistantResponse BuildProductResponse(
        string userMessage,
        IReadOnlyList<ProductConsultationResult> products,
        bool comparison,
        bool scopedRecommendation = false)
    {
        var isComparison = comparison &&
            products.Select(product => product.ProductId).Distinct().Count() >= 2;
        return new AiAssistantResponse(
            scopedRecommendation && !isComparison
                ? BuildScopedRecommendationResponse(userMessage, products)
                : BuildCatalogResponse(userMessage, products),
            products,
            isComparison
                ? ChatResponseTypes.Comparison
                : ChatResponseTypes.Recommendation,
            isComparison ? ComparisonQuickReplies : Array.Empty<string>());
    }

    private async Task<IReadOnlyList<int>> GetLanguageModelSelectionAsync(
        AiConversationRequest request,
        IReadOnlyList<ProductConsultationResult> products,
        CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient("AiAssistant");
        client.Timeout = TimeSpan.FromSeconds(Math.Clamp(_options.TimeoutSeconds, 5, 180));

        var endpoint = $"{_options.BaseUrl.TrimEnd('/')}/chat/completions";
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, endpoint);
        if (!string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            httpRequest.Headers.Authorization =
                new AuthenticationHeaderValue("Bearer", _options.ApiKey);
        }

        var messages = new List<object>
        {
            new
            {
                role = "system",
                content = BuildSelectionPrompt(products)
            }
        };
        messages.AddRange(request.History.Select(message => (object)new
        {
            role = message.Role,
            content = message.Content
        }));
        messages.Add(new { role = "user", content = request.UserMessage });

        httpRequest.Content = JsonContent.Create(new
        {
            model = _options.Model,
            messages,
            temperature = 0,
            max_tokens = 120
        });

        using var response = await client.SendAsync(httpRequest, cancellationToken);
        response.EnsureSuccessStatusCode();
        using var document = JsonDocument.Parse(
            await response.Content.ReadAsStringAsync(cancellationToken));

        var content = document.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString();
        return ParseSelectedVariantIds(content, products);
    }

    private static string BuildSelectionPrompt(IReadOnlyList<ProductConsultationResult> products)
    {
        var context = string.Join(
            "\n",
            products.Select(product =>
                $"- VariantId={product.VariantId}; Product={product.ProductName}; " +
                $"Brand={product.Brand}; Category={product.Category}; Condition={product.Condition}; " +
                $"PriceVND={product.Price:0}; Stock={product.Stock}; " +
                $"Specifications={string.Join(", ", product.Specifications.Select(item => $"{item.Key}: {item.Value}"))}"));

        return """
               Select up to 3 variants that best match the user's latest request and conversation.
               Use only the candidate list below. Prefer in-stock variants and respect budget,
               brand, RAM, storage, condition and intended use.
               Return JSON only in this exact shape: {"variantIds":[101,102]}
               Do not return prose, prices, product names or IDs that are not candidates.

               CANDIDATES:
               """ + "\n" + context;
    }

    private static IReadOnlyList<int> ParseSelectedVariantIds(
        string? content,
        IReadOnlyList<ProductConsultationResult> products)
    {
        if (string.IsNullOrWhiteSpace(content))
            return Array.Empty<int>();

        var start = content.IndexOf('{');
        var end = content.LastIndexOf('}');
        if (start < 0 || end <= start)
            return Array.Empty<int>();

        try
        {
            using var document = JsonDocument.Parse(content[start..(end + 1)]);
            var allowedIds = products.Select(product => product.VariantId).ToHashSet();
            return document.RootElement
                .GetProperty("variantIds")
                .EnumerateArray()
                .Where(value => value.TryGetInt32(out _))
                .Select(value => value.GetInt32())
                .Where(allowedIds.Contains)
                .Distinct()
                .Take(3)
                .ToList();
        }
        catch (JsonException)
        {
            return Array.Empty<int>();
        }
        catch (KeyNotFoundException)
        {
            return Array.Empty<int>();
        }
    }

    internal static string BuildCatalogResponse(
        string userMessage,
        IReadOnlyList<ProductConsultationResult> products)
    {
        var normalized = ProductConsultationService.Normalize(userMessage);
        if (products.Count == 0)
        {
            if (normalized.Contains("xin chao") ||
                normalized.Contains("chao ban") ||
                normalized is "hi" or "hello")
            {
                return "Xin chào! Tôi có thể tìm sản phẩm theo ngân sách, thương hiệu, RAM, bộ nhớ, tình trạng và tồn kho. Bạn đang cần sản phẩm như thế nào?";
            }

            return "Tôi chưa tìm thấy sản phẩm khớp chính xác với yêu cầu này trong dữ liệu cửa hàng. Bạn có thể cho tôi thêm ngân sách, thương hiệu, RAM hoặc bộ nhớ mong muốn; hoặc bấm \"Gặp nhân viên tư vấn\" để được hỗ trợ trực tiếp.";
        }

        var productGroups = products
            .GroupBy(product => product.ProductId)
            .Take(MaxDisplayedProducts)
            .ToList();
        var productCount = productGroups.Count;
        var variantCount = productGroups.Sum(group =>
            Math.Min(group.Count(), MaxDisplayedVariantsPerProduct));
        var comparison = normalized.Contains("so sanh");
        if (comparison && productGroups.Count >= 2)
        {
            return BuildComparisonResponse(productGroups);
        }
        var heading = comparison
            ? $"Dưới đây là {productCount} sản phẩm với {variantCount} phiên bản để bạn so sánh:"
            : $"Tôi tìm thấy {productCount} sản phẩm với {variantCount} phiên bản phù hợp:";
        var lines = productGroups.Select((group, index) =>
        {
            var product = group.First();
            var variants = group
                .Take(MaxDisplayedVariantsPerProduct)
                .Select(variant =>
            {
                var saleNote = variant.Price < variant.BasePrice
                    ? $" (giá gốc {FormatCurrency(variant.BasePrice)})"
                    : string.Empty;
                var stockText = variant.Stock > 0
                    ? $"còn {variant.Stock} máy"
                    : "tạm hết hàng";
                var keySpecs = string.Join(
                    ", ",
                    variant.Specifications
                        .Take(4)
                        .Select(item => $"{item.Key}: {item.Value}"));
                var specsText = string.IsNullOrWhiteSpace(keySpecs)
                    ? string.Empty
                    : $"\n     Thông số: {keySpecs}";

                return $"   - {variant.Condition}: {FormatCurrency(variant.Price)}" +
                       $"{saleNote}; {stockText}." +
                       specsText;
            });

            return $"{index + 1}. {product.ProductName}\n" +
                   string.Join("\n", variants) +
                   $"\n   Xem chi tiết: /products/{product.ProductId}";
        });

        return heading + "\n\n" + string.Join("\n\n", lines) +
               "\n\nTôi chỉ hiển thị tối đa 3 sản phẩm phù hợp nhất mỗi lần. " +
               "Bạn có thể bổ sung ngân sách, thương hiệu, RAM, bộ nhớ hoặc nhu cầu sử dụng để lọc chính xác hơn.";
    }

    private static ClarificationPrompt? GetClarification(AiConversationRequest request)
    {
        var normalizedCurrent = ProductConsultationService.Normalize(request.UserMessage);
        if (IsComparisonRequest(normalizedCurrent))
            return null;

        var normalized = ProductConsultationService.Normalize(string.Join(
            " ",
            request.History
                .Where(message => message.Role == "user")
                .TakeLast(3)
                .Select(message => message.Content)
                .Append(request.UserMessage)));

        if (!ContainsAny(
                normalized,
                "tu van",
                "mua",
                "dien thoai",
                "san pham",
                "may nao",
                "tim may",
                "chon may"))
        {
            return null;
        }

        var hasBudget = Regex.IsMatch(
            normalized,
            @"\d+(?:[.,]\d+)?\s*(trieu|tr|k|vnd|dong)");
        var hasUsage = ContainsAny(
            normalized,
            "choi game",
            "gaming",
            "chup anh",
            "quay video",
            "camera",
            "pin lau",
            "pin trau",
            "hoc tap",
            "sinh vien",
            "van phong",
            "lam viec");
        var hasTechnicalConstraint =
            Regex.IsMatch(normalized, @"\d+\s*(gb|tb)") ||
            ContainsAny(
                normalized,
                "ram",
                "bo nho",
                "chip",
                "con hang",
                "new seal",
                "likenew",
                "moi 100%");
        var hasSpecificName = HasSpecificCatalogTerm(normalized);

        if (hasTechnicalConstraint || hasSpecificName || hasBudget && hasUsage)
            return null;

        if (!hasBudget)
        {
            return new ClarificationPrompt(
                hasUsage
                    ? "Tôi đã hiểu nhu cầu chính của bạn. Ngân sách dự kiến là bao nhiêu để tôi lọc đúng các máy phù hợp?"
                    : "Để bắt đầu, bạn muốn tìm điện thoại trong khoảng ngân sách nào?",
                BudgetQuickReplies);
        }

        if (!hasUsage)
        {
            return new ClarificationPrompt(
                "Trong khoảng ngân sách đó, nhu cầu bạn ưu tiên nhất là gì?",
                UsageQuickReplies);
        }

        return null;
    }

    private static bool HasSpecificCatalogTerm(string normalized)
    {
        var genericWords = new HashSet<string>
        {
            "toi", "minh", "can", "muon", "mua", "tu", "van", "giup", "dien", "thoai",
            "san", "pham", "may", "nao", "tot", "phu", "hop", "co", "khong", "cho",
            "mot", "chiec", "khoang", "gia", "duoi", "tren", "tu", "den", "trieu",
            "ngan", "sach", "tim", "chon",
            "choi", "game", "gaming", "chup", "anh", "quay", "video", "camera", "pin",
            "lau", "trau", "hoc", "tap", "sinh", "vien", "van", "phong", "lam", "viec"
        };
        return Regex.Matches(normalized, @"[\p{L}\p{N}]+")
            .Select(match => match.Value)
            .Any(token =>
                token.Length >= 3 &&
                !genericWords.Contains(token) &&
                !int.TryParse(token, out _));
    }

    private static bool IsComparisonRequest(string message) =>
        ProductConsultationService.Normalize(message).Contains("so sanh");

    private static bool IsReferentialComparison(string message)
    {
        var normalized = ProductConsultationService.Normalize(message);
        return ContainsAny(
            normalized,
            "may tren",
            "hai may nay",
            "2 may nay",
            "cac may nay",
            "nhung may nay",
            "san pham tren");
    }

    private static bool ShouldUseConversationContext(AiConversationRequest request)
    {
        if (request.History.Count == 0)
            return false;

        var normalized = ProductConsultationService.Normalize(request.UserMessage);
        var wordCount = Regex.Matches(normalized, @"[\p{L}\p{N}]+").Count;
        if (wordCount > 8)
            return false;

        var previousAssistant = request.History.LastOrDefault(message =>
            message.Role == "assistant");
        if (previousAssistant?.ResponseType is
            ChatResponseTypes.Clarification or ChatResponseTypes.Comparison)
        {
            return true;
        }

        return ContainsAny(
            normalized,
            "may tren",
            "cac may nay",
            "nhung may nay",
            "con may nao",
            "mau khac",
            "phien ban khac",
            "uu tien camera",
            "uu tien hieu nang",
            "uu tien pin",
            "chon may gia tot nhat");
    }

    private static IReadOnlyList<int> GetScopedProductIds(AiConversationRequest request)
    {
        var normalized = ProductConsultationService.Normalize(request.UserMessage);
        var wordCount = Regex.Matches(normalized, @"[\p{L}\p{N}]+").Count;
        var explicitReference = ContainsAny(
            normalized,
            "may do",
            "may nay",
            "may tren",
            "cac may do",
            "cac may nay",
            "cac may tren",
            "nhung may do",
            "nhung may nay",
            "nhung may tren",
            "trong 2 may",
            "trong 3 may",
            "trong cac may",
            "trong nhung may",
            "san pham do",
            "san pham tren");
        var shortPreference = wordCount <= 6 && ContainsAny(
            normalized,
            "chup anh",
            "camera",
            "choi game",
            "gaming",
            "pin lau",
            "pin trau",
            "hieu nang",
            "gia tot");
        if (!explicitReference && !shortPreference)
            return Array.Empty<int>();

        var previousRecommendation = request.History.LastOrDefault(message =>
            message.Role == "assistant" &&
            (message.ResponseType is
                ChatResponseTypes.Recommendation or
                ChatResponseTypes.Comparison) &&
            message.ProductIds is { Count: > 0 });
        return previousRecommendation?.ProductIds?
            .Distinct()
            .ToList()
            ?? (IReadOnlyList<int>)Array.Empty<int>();
    }

    private static string BuildScopedRecommendationResponse(
        string userMessage,
        IReadOnlyList<ProductConsultationResult> products)
    {
        if (products.Count == 0)
            return BuildCatalogResponse(userMessage, products);

        var normalized = ProductConsultationService.Normalize(userMessage);
        var preference = ContainsAny(normalized, "chup anh", "camera", "quay phim", "quay video")
            ? "chụp ảnh"
            : ContainsAny(normalized, "choi game", "gaming", "hieu nang")
                ? "hiệu năng và chơi game"
                : ContainsAny(normalized, "pin lau", "pin trau", "thoi luong pin")
                    ? "thời lượng pin"
                    : "nhu cầu này";
        var best = products.First();
        var relevantSpecs = best.Specifications
            .Where(item =>
            {
                var key = ProductConsultationService.Normalize(item.Key);
                return preference switch
                {
                    "chụp ảnh" => ContainsAny(key, "camera", "quay video"),
                    "hiệu năng và chơi game" => ContainsAny(key, "chipset", "gpu", "ram", "man hinh"),
                    "thời lượng pin" => ContainsAny(key, "pin", "sac"),
                    _ => true
                };
            })
            .Take(3)
            .Select(item => $"{item.Key}: {item.Value}")
            .ToList();
        var reason = relevantSpecs.Count > 0
            ? $" Điểm nổi bật: {string.Join(", ", relevantSpecs)}."
            : string.Empty;
        var ranking = string.Join(
            " → ",
            products
                .GroupBy(product => product.ProductId)
                .Select(group => group.First().ProductName)
                .Take(MaxDisplayedProducts));

        return $"Trong các máy vừa đề xuất, {best.ProductName} phù hợp nhất cho {preference}." +
               reason +
               $"\n\nThứ tự gợi ý: {ranking}.";
    }

    private static IReadOnlyList<ProductConsultationResult> RestrictToComparedProducts(
        AiConversationRequest request,
        IReadOnlyList<ProductConsultationResult> products)
    {
        var normalizedCurrent = ProductConsultationService.Normalize(request.UserMessage);
        if (!ContainsAny(
                normalizedCurrent,
                "uu tien camera",
                "uu tien hieu nang",
                "uu tien pin",
                "chon may gia tot nhat",
                "may gia tot nhat"))
        {
            return products;
        }

        var comparisonContext = request.History
            .LastOrDefault(message =>
                message.Role == "assistant" &&
                message.ResponseType == ChatResponseTypes.Comparison);
        if (comparisonContext == null)
            return products;

        var comparedProductIds = comparisonContext.ProductIds?
            .ToHashSet();
        if (comparedProductIds is { Count: > 0 })
        {
            var productsById = products
                .Where(product => comparedProductIds.Contains(product.ProductId))
                .ToList();
            return productsById.Count > 0 ? productsById : products;
        }

        var normalizedComparison = ProductConsultationService.Normalize(
            comparisonContext.Content);
        var comparedProducts = products
            .Where(product =>
                normalizedComparison.Contains(
                    ProductConsultationService.Normalize(product.ProductName)))
            .ToList();
        return comparedProducts.Count >= 2 ? comparedProducts : products;
    }

    private static string BuildComparisonResponse(
        IReadOnlyList<IGrouping<int, ProductConsultationResult>> productGroups)
    {
        var compared = productGroups.Take(3).Select(group => group.First()).ToList();
        var sections = compared.Select((product, index) =>
        {
            var ram = FindSpecification(product, "ram") ?? "Chưa có dữ liệu";
            var storage = FindSpecification(product, "bo nho trong", "storage", "rom") ?? "Chưa có dữ liệu";
            var chipset = FindSpecification(product, "chipset", "cpu") ?? "Chưa có dữ liệu";
            var camera = FindSpecification(product, "camera sau", "camera") ?? "Chưa có dữ liệu";
            var battery = FindSpecification(product, "pin") ?? "Chưa có dữ liệu";
            var stock = product.Stock > 0 ? $"Còn {product.Stock} máy" : "Tạm hết hàng";

            return $"{index + 1}. {product.ProductName} ({product.Condition})\n" +
                   $"   Giá: {FormatCurrency(product.Price)} | {stock}\n" +
                   $"   Chip: {chipset}\n" +
                   $"   RAM / Bộ nhớ: {ram} / {storage}\n" +
                   $"   Camera: {camera}\n" +
                   $"   Pin: {battery}\n" +
                   $"   Chi tiết: /products/{product.ProductId}";
        });

        var cheapest = compared.OrderBy(product => product.Price).First();
        var available = compared.Where(product => product.Stock > 0).ToList();
        var availabilityNote = available.Count > 0
            ? $"Có thể mua ngay: {string.Join(", ", available.Select(product => product.ProductName).Distinct())}."
            : "Các lựa chọn trên hiện đều tạm hết hàng.";
        return $"So sánh nhanh {compared.Count} sản phẩm:\n\n" +
               string.Join("\n\n", sections) +
               $"\n\nGiá thấp nhất: {cheapest.ProductName} - {FormatCurrency(cheapest.Price)}.\n" +
               availabilityNote +
               "\nBạn ưu tiên camera, hiệu năng hay pin để tôi chốt một lựa chọn phù hợp nhất?";
    }

    private static string? FindSpecification(
        ProductConsultationResult product,
        params string[] terms)
    {
        var match = product.Specifications.FirstOrDefault(item =>
        {
            var key = ProductConsultationService.Normalize(item.Key);
            return terms.Any(term => key.Contains(term));
        });
        return string.IsNullOrWhiteSpace(match.Key) ? null : match.Value;
    }

    private static bool ContainsAny(string value, params string[] terms) =>
        terms.Any(value.Contains);

    private static string FormatCurrency(decimal value) =>
        $"{value:N0}đ".Replace(",", ".");

    private sealed record ClarificationPrompt(
        string Text,
        IReadOnlyList<string> QuickReplies);
}
