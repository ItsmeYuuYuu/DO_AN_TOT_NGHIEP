using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using ECommerceBackend.Models;
using ECommerceBackend.Data;
using ECommerceBackend.Services;
using ECommerceBackend.Services.Checkout;
using ECommerceBackend.Filters;
using ECommerceBackend.Middlewares;
using ECommerceBackend.DTOs.Common;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Serilog;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, services, configuration) => configuration
    .ReadFrom.Configuration(context.Configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext()
    .WriteTo.Console());

// ── JWT Settings & Startup Secret Validation ─────────────────────────────────
var jwtSection = builder.Configuration.GetSection("JwtSettings");
var secretKey   = jwtSection["SecretKey"]!;
var issuer      = jwtSection["Issuer"]!;
var audience    = jwtSection["Audience"]!;

if (string.IsNullOrEmpty(secretKey) || secretKey.Contains("Dev_Safe_Placeholder_Key"))
{
    Console.ForegroundColor = ConsoleColor.Yellow;
    Console.WriteLine("=========================================================================");
    Console.WriteLine("WARNING: Using dev-safe placeholder JWT SecretKey.");
    Console.WriteLine("Please set the actual JWT SecretKey via user-secrets or environment variables.");
    Console.WriteLine("=========================================================================");
    Console.ResetColor();
}

var key         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));

// ── Authentication & Authorization ───────────────────────────────────────────
builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false; // dev-only; set true in prod
        options.SaveToken            = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey         = key,
            ValidateIssuer           = true,
            ValidIssuer              = issuer,
            ValidateAudience         = true,
            ValidAudience            = audience,
            ValidateLifetime         = true,
            ClockSkew                = TimeSpan.Zero, // No slack on expiry
        };
    });

builder.Services.AddAuthorization();

// ── Chat abuse protection ────────────────────────────────────────────────────
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.ContentType = "application/json; charset=utf-8";
        await context.HttpContext.Response.WriteAsJsonAsync(
            new ApiErrorDto(
                "Bạn gửi yêu cầu quá nhanh. Vui lòng chờ một chút rồi thử lại.",
                null),
            cancellationToken);
    };
    options.AddPolicy("ChatRequests", httpContext =>
    {
        var userId = httpContext.User.FindFirst("userid")?.Value;
        var remoteIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var partitionKey = !string.IsNullOrWhiteSpace(userId)
            ? $"user:{userId}"
            : $"ip:{remoteIp}";

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 12,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            });
    });
});

// ── Audit Log (Singleton background service + scoped filter) ─────────────────────
builder.Services.Configure<ECommerceBackend.Services.Chat.AiAssistantOptions>(
    builder.Configuration.GetSection(ECommerceBackend.Services.Chat.AiAssistantOptions.SectionName));
builder.Services.AddHttpClient("AiAssistant");
builder.Services.AddScoped<ECommerceBackend.Services.Chat.IProductConsultationService, ECommerceBackend.Services.Chat.ProductConsultationService>();
builder.Services.AddScoped<ECommerceBackend.Services.Chat.IAiProvider, ECommerceBackend.Services.Chat.GroundedAiProvider>();
builder.Services.AddScoped<ECommerceBackend.Services.Chat.IChatOrchestratorService, ECommerceBackend.Services.Chat.ChatOrchestratorService>();
builder.Services.AddSingleton<ProductImageStorageService>();
var redisConnection = builder.Configuration.GetConnectionString("Redis");
if (!string.IsNullOrWhiteSpace(redisConnection))
{
    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = redisConnection;
        options.InstanceName = "ECommerce:";
    });
}
else
{
    builder.Services.AddDistributedMemoryCache();
}
builder.Services.AddScoped<ICheckoutAbuseProtectionService, CheckoutAbuseProtectionService>();
builder.Services.AddHostedService<ExpiredOrderCleanupService>();
builder.Services.AddSingleton<AuditLogService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<AuditLogService>());
builder.Services.AddScoped<AuditActionFilter>();

// ── Health Checks ─────────────────────────────────────────────────────────────
builder.Services.AddHealthChecks();

// ── Controllers + JSON + Global Audit Filter ─────────────────────────────────
builder.Services.AddControllers(options =>
    {
        // Áp dụng AuditActionFilter cho TOÀN BỘ controllers
        options.Filters.AddService<AuditActionFilter>();
    })
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.ReferenceHandler =
            System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles)
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = context.ModelState
                .Where(e => e.Value != null && e.Value.Errors.Count > 0)
                .ToDictionary(
                    kvp => kvp.Key,
                    kvp => kvp.Value!.Errors.Select(e => e.ErrorMessage).ToArray()
                );

            var apiError = new ApiErrorDto("Dữ liệu đầu vào không hợp lệ.", errors);
            return new BadRequestObjectResult(apiError);
        };
    });

// ── EF Core & Connection String Verification ──────────────────────────────────
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrEmpty(connectionString) || connectionString.Contains("YOUR_LOCAL_DB_PASSWORD"))
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine("=========================================================================");
    Console.WriteLine("CRITICAL ERROR: Connection string 'DefaultConnection' is missing or has placeholder value!");
    Console.WriteLine("Please configure user-secrets or environment variables (see walkthrough.md).");
    Console.WriteLine("=========================================================================");
    Console.ResetColor();
    throw new InvalidOperationException("ECommerceBackend cannot start: ConnectionStrings:DefaultConnection is using placeholder. Run 'dotnet user-secrets set' to configure.");
}

builder.Services.AddDbContext<ECommerceContext>(options =>
    options.UseNpgsql(connectionString));

// ── CORS ──────────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins(
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:3000")
        .AllowAnyMethod()
        .AllowAnyHeader()));

// ── Swagger (with JWT Bearer support) ────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "ECommerce API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header. Format: **Bearer {token}**",
        Name        = "Authorization",
        In          = ParameterLocation.Header,
        Type        = SecuritySchemeType.Http,
        Scheme      = "bearer",
        BearerFormat = "JWT",
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                    { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
var app = builder.Build();

// ── Seed Database ─────────────────────────────────────────────────────────────
if (!app.Environment.IsEnvironment("Testing"))
{
    await DbInitializer.SeedAsync(app.Services);
}

// ── Middleware pipeline ───────────────────────────────────────────────────────
app.UseMiddleware<GlobalExceptionHandlerMiddleware>();
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseAuthentication();   // ← Must come before UseAuthorization
app.UseRateLimiter();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/api/health");

app.Run();

public partial class Program { }
