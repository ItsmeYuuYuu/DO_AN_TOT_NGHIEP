using ECommerceBackend.DTOs.Returns;

namespace ECommerceBackend.Services.Returns;

public interface IReturnRefundPolicyService
{
    string PolicyVersion { get; }
    IReadOnlySet<string> ReasonCategories { get; }
    IReadOnlySet<string> InspectionGrades { get; }
    IReadOnlySet<string> FaultResponsibilities { get; }
    DateTime ResolveDeliveryDate(DateTime? deliveredAt, DateTime? warehouseCompletedAt, DateTime? orderDate);
    int DaysSinceDelivery(DateTime deliveryDate, DateTime now);
    RefundCalculationItemDto Estimate(
        int orderItemId,
        string imei,
        decimal originalPaidAmount,
        int daysSinceDelivery,
        string reasonCategory);
    RefundCalculationItemDto Calculate(
        int orderItemId,
        string imei,
        decimal originalPaidAmount,
        int daysSinceDelivery,
        string inspectionGrade,
        string faultResponsibility,
        bool missingBox,
        int missingAccessoryCount);
}

public sealed class ReturnRefundPolicyService : IReturnRefundPolicyService
{
    public const string CurrentPolicyVersion = "2026.07";

    private static readonly HashSet<string> SupportedReasonCategories =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "ChangeOfMind",
            "ManufacturerDefect",
            "StoreFault",
            "CarrierDamage",
            "CustomerDamage",
            "Other"
        };

    private static readonly HashSet<string> SupportedInspectionGrades =
        new(StringComparer.OrdinalIgnoreCase) { "NewSeal", "Grade99", "Grade98", "Damaged" };

    private static readonly HashSet<string> SupportedFaultResponsibilities =
        new(StringComparer.OrdinalIgnoreCase) { "Manufacturer", "Store", "Carrier", "Customer", "NoFault" };

    public string PolicyVersion => CurrentPolicyVersion;
    public IReadOnlySet<string> ReasonCategories => SupportedReasonCategories;
    public IReadOnlySet<string> InspectionGrades => SupportedInspectionGrades;
    public IReadOnlySet<string> FaultResponsibilities => SupportedFaultResponsibilities;

    public DateTime ResolveDeliveryDate(
        DateTime? deliveredAt,
        DateTime? warehouseCompletedAt,
        DateTime? orderDate) =>
        deliveredAt ?? warehouseCompletedAt ?? orderDate
        ?? throw new InvalidOperationException("Không xác định được ngày giao hàng thành công.");

    public int DaysSinceDelivery(DateTime deliveryDate, DateTime now) =>
        Math.Max(0, (now.Date - deliveryDate.Date).Days);

    public RefundCalculationItemDto Estimate(
        int orderItemId,
        string imei,
        decimal originalPaidAmount,
        int daysSinceDelivery,
        string reasonCategory)
    {
        var normalizedCategory = Match(SupportedReasonCategories, reasonCategory, nameof(reasonCategory));
        var assumedResponsibility = normalizedCategory switch
        {
            "ManufacturerDefect" => "Manufacturer",
            "StoreFault" => "Store",
            "CarrierDamage" => "Carrier",
            "CustomerDamage" => "Customer",
            _ => "NoFault"
        };

        return Calculate(
            orderItemId,
            imei,
            originalPaidAmount,
            daysSinceDelivery,
            daysSinceDelivery <= 7 ? "NewSeal" : "Grade99",
            assumedResponsibility,
            missingBox: false,
            missingAccessoryCount: 0);
    }

    public RefundCalculationItemDto Calculate(
        int orderItemId,
        string imei,
        decimal originalPaidAmount,
        int daysSinceDelivery,
        string inspectionGrade,
        string faultResponsibility,
        bool missingBox,
        int missingAccessoryCount)
    {
        if (originalPaidAmount < 0)
            throw new ArgumentOutOfRangeException(nameof(originalPaidAmount));
        if (daysSinceDelivery < 0)
            throw new ArgumentOutOfRangeException(nameof(daysSinceDelivery));
        if (missingAccessoryCount is < 0 or > 10)
            throw new ArgumentOutOfRangeException(nameof(missingAccessoryCount));

        var grade = Match(SupportedInspectionGrades, inspectionGrade, nameof(inspectionGrade));
        var responsibility = Match(
            SupportedFaultResponsibilities,
            faultResponsibility,
            nameof(faultResponsibility));

        decimal timeRate;
        decimal conditionRate;
        decimal missingBoxRate;
        decimal missingAccessoryRate;

        if (responsibility is "Manufacturer" or "Store" or "Carrier")
        {
            timeRate = 0m;
            conditionRate = 0m;
            missingBoxRate = 0m;
            missingAccessoryRate = 0m;
        }
        else if (responsibility == "Customer" || grade == "Damaged" || daysSinceDelivery > 30)
        {
            timeRate = 100m;
            conditionRate = 0m;
            missingBoxRate = 0m;
            missingAccessoryRate = 0m;
        }
        else
        {
            if (grade == "NewSeal")
            {
                timeRate = daysSinceDelivery switch
                {
                    <= 7 => 0m,
                    <= 15 => 5m,
                    _ => 10m
                };
                conditionRate = 0m;
            }
            else
            {
                timeRate = daysSinceDelivery switch
                {
                    <= 7 => 10m,
                    <= 15 => 15m,
                    _ => 20m
                };
                conditionRate = grade == "Grade98" ? 5m : 0m;
            }

            missingBoxRate = missingBox ? 2m : 0m;
            missingAccessoryRate = missingAccessoryCount * 5m;
        }

        var totalRate = timeRate >= 100m
            ? 100m
            : Math.Min(30m, timeRate + conditionRate + missingBoxRate + missingAccessoryRate);
        var deductionAmount = decimal.Round(
            originalPaidAmount * totalRate / 100m,
            0,
            MidpointRounding.AwayFromZero);
        var refundAmount = Math.Max(0m, originalPaidAmount - deductionAmount);

        return new RefundCalculationItemDto(
            orderItemId,
            imei,
            originalPaidAmount,
            grade,
            responsibility,
            timeRate,
            conditionRate,
            missingBoxRate,
            missingAccessoryRate,
            totalRate,
            deductionAmount,
            refundAmount);
    }

    private static string Match(HashSet<string> supported, string value, string parameterName)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("Giá trị không được để trống.", parameterName);

        return supported.FirstOrDefault(item => item.Equals(value.Trim(), StringComparison.OrdinalIgnoreCase))
            ?? throw new ArgumentException($"Giá trị '{value}' không hợp lệ.", parameterName);
    }
}
