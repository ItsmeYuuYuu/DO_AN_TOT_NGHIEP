namespace ECommerceBackend.DTOs.Common
{
    public record LookupDto(int Id, string Name);
    public record ApiMessageDto(string Message);
    public record ApiErrorDto(string Message, Dictionary<string, string[]>? Errors = null);
}
