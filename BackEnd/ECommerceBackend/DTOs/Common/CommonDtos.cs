using System;
using System.Collections.Generic;

namespace ECommerceBackend.DTOs.Common
{
    public record LookupDto(int Id, string Name);
    public record ApiMessageDto(string Message);
    public record ApiErrorDto(string Message, Dictionary<string, string[]>? Errors = null);

    public class PagedResultDto<T>
    {
        public IEnumerable<T> Items { get; set; } = new List<T>();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => PageSize > 0 ? (int)Math.Ceiling(TotalCount / (double)PageSize) : 0;
    }
}
