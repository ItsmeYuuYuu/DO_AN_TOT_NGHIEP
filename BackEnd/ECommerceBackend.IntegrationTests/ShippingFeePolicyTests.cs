using ECommerceBackend.Services.Checkout;

namespace ECommerceBackend.IntegrationTests;

public sealed class ShippingFeePolicyTests
{
    private const string HoChiMinhCity = "Th\u00e0nh ph\u1ed1 H\u1ed3 Ch\u00ed Minh";
    private const string HaiPhongCity = "Th\u00e0nh ph\u1ed1 H\u1ea3i Ph\u00f2ng";
    private readonly ShippingFeePolicy _policy = new();

    [Fact]
    public void InnerHoChiMinhCity_CostsThirtyThousand()
    {
        var quote = _policy.Calculate(1_500_000m, HoChiMinhCity, "Ph\u01b0\u1eddng B\u1ebfn Th\u00e0nh");

        Assert.Equal(30_000m, quote.Fee);
        Assert.Equal("HoChiMinhInner", quote.Zone);
    }

    [Fact]
    public void OuterHoChiMinhCity_CostsFiftyThousand()
    {
        var quote = _policy.Calculate(1_500_000m, HoChiMinhCity, "X\u00e3 C\u1ee7 Chi");

        Assert.Equal(50_000m, quote.Fee);
        Assert.Equal("HoChiMinhOuter", quote.Zone);
    }

    [Fact]
    public void OutsideHoChiMinhCity_CostsFiftyThousand()
    {
        var quote = _policy.Calculate(1_500_000m, HaiPhongCity, "Ph\u01b0\u1eddng An Bi\u00ean");

        Assert.Equal(50_000m, quote.Fee);
        Assert.Equal("OutsideHoChiMinhCity", quote.Zone);
    }

    [Theory]
    [InlineData(HoChiMinhCity, "X\u00e3 C\u1ee7 Chi")]
    [InlineData(HaiPhongCity, "Ph\u01b0\u1eddng An Bi\u00ean")]
    public void OrdersAtFreeShippingThreshold_HaveNoShippingFee(string province, string ward)
    {
        var quote = _policy.Calculate(2_000_000m, province, ward);

        Assert.Equal(0m, quote.Fee);
        Assert.Equal("Free", quote.Zone);
    }
}
