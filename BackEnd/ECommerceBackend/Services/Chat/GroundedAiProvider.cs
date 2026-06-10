using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace ECommerceBackend.Services.Chat;

public sealed class GroundedAiProvider : IAiProvider
{
    private const int MaxDisplayedProducts = 3;
    private const int MaxDisplayedVariantsPerProduct = 2;

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
        var recentUserContext = request.History
            .Where(message => message.Role == "user")
            .TakeLast(2)
            .Select(message => message.Content);
        var retrievalQuery = string.Join(
            " ",
            recentUserContext.Append(request.UserMessage));
        var products = await _productConsultation.SearchAsync(
            retrievalQuery,
            cancellationToken);

        if (products.Count == 0)
        {
            return new AiAssistantResponse(
                BuildCatalogResponse(request.UserMessage, products),
                Array.Empty<ProductConsultationResult>());
        }

        if (_options.UseLanguageModel)
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
                        var displayedProducts = SelectDisplayedVariants(selectedProducts);
                        return new AiAssistantResponse(
                            BuildCatalogResponse(request.UserMessage, displayedProducts),
                            displayedProducts);
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

        var displayedFallback = SelectDisplayedVariants(products);
        return new AiAssistantResponse(
            BuildCatalogResponse(request.UserMessage, displayedFallback),
            displayedFallback);
    }

    private static IReadOnlyList<ProductConsultationResult> SelectDisplayedVariants(
        IReadOnlyList<ProductConsultationResult> products) =>
        products
            .GroupBy(product => product.ProductId)
            .Take(MaxDisplayedProducts)
            .SelectMany(group => group.Take(MaxDisplayedVariantsPerProduct))
            .ToList();

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

    private static string FormatCurrency(decimal value) =>
        $"{value:N0}đ".Replace(",", ".");
}
