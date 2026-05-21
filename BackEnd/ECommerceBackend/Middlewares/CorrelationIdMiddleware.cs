using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Primitives;
using Serilog.Context;
using System;
using System.Threading.Tasks;

namespace ECommerceBackend.Middlewares
{
    public class CorrelationIdMiddleware
    {
        private readonly RequestDelegate _next;
        private const string CorrelationIdHeaderName = "X-Correlation-Id";

        public CorrelationIdMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var correlationId = GetCorrelationId(context);

            using (LogContext.PushProperty("CorrelationId", correlationId))
            {
                context.Response.OnStarting(() =>
                {
                    context.Response.Headers[CorrelationIdHeaderName] = new StringValues(correlationId);
                    return Task.CompletedTask;
                });

                await _next(context);
            }
        }

        private static string GetCorrelationId(HttpContext context)
        {
            if (context.Request.Headers.TryGetValue(CorrelationIdHeaderName, out var correlationId))
            {
                return correlationId!;
            }

            return Guid.NewGuid().ToString();
        }
    }
}
