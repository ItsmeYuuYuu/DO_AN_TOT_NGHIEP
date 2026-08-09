using System.ComponentModel.DataAnnotations;

namespace ECommerceBackend.Validation;

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public sealed class SafeTextAttribute : ValidationAttribute
{
    public override bool IsValid(object? value)
    {
        if (value is not string text || string.IsNullOrEmpty(text)) return true;

        return !text.Any(char.IsControl) &&
               !text.Contains('<') &&
               !text.Contains('>') &&
               !text.Contains("javascript:", StringComparison.OrdinalIgnoreCase) &&
               !text.Contains("data:text/html", StringComparison.OrdinalIgnoreCase);
    }
}
