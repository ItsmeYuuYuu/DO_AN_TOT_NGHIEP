using ECommerceBackend.Services.Returns;

namespace ECommerceBackend.IntegrationTests;

public sealed class ReturnRefundPolicyTests
{
    private readonly ReturnRefundPolicyService _policy = new();

    [Theory]
    [InlineData(0, 10)]
    [InlineData(7, 10)]
    [InlineData(8, 15)]
    [InlineData(15, 15)]
    [InlineData(16, 20)]
    [InlineData(30, 20)]
    [InlineData(31, 100)]
    public void Change_Of_Mind_Uses_Delivery_Day_Bands(int days, decimal expectedRate)
    {
        var result = _policy.Calculate(
            1,
            "IMEI-1",
            10_000_000m,
            days,
            "Grade99",
            "NoFault",
            missingBox: false,
            missingAccessoryCount: 0);

        Assert.Equal(expectedRate, result.Totaldeductionrate);
    }

    [Theory]
    [InlineData("Manufacturer")]
    [InlineData("Store")]
    [InlineData("Carrier")]
    public void Business_Responsible_Fault_Has_No_Depreciation(string responsibility)
    {
        var result = _policy.Calculate(
            1,
            "IMEI-1",
            20_000_000m,
            30,
            "Grade98",
            responsibility,
            missingBox: true,
            missingAccessoryCount: 2);

        Assert.Equal(0m, result.Totaldeductionrate);
        Assert.Equal(20_000_000m, result.Refundamount);
    }

    [Fact]
    public void Condition_And_Missing_Items_Are_Capped_At_Thirty_Percent()
    {
        var result = _policy.Calculate(
            1,
            "IMEI-1",
            20_000_000m,
            20,
            "Grade98",
            "NoFault",
            missingBox: true,
            missingAccessoryCount: 5);

        Assert.Equal(30m, result.Totaldeductionrate);
        Assert.Equal(14_000_000m, result.Refundamount);
    }
}
