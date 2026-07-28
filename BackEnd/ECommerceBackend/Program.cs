using System.Text;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using ECommerceBackend.Models;
//using ECommerceBackend.Data;
//using ECommerceBackend.Services;
//using ECommerceBackend.Services.Checkout;
//using ECommerceBackend.Filters;
using ECommerceBackend.Middlewares;
using ECommerceBackend.DTOs.Common;
using ECommerceBackend.Serialization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Serilog;
using System.Threading.RateLimiting;

// The existing PostgreSQL schema stores application timestamps without a time-zone.
// Keep UTC DateTime values compatible until those columns are migrated to timestamptz.
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

LoadEnvironmentFile();
var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, services, configuration) => configuration
    .ReadFrom.Configuration(context.Configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext()
    .WriteTo.Console());

// ── JWT Settings & Startup Secret Validation ─────────────────────────────────
var jwtSection = builder.Configuration.GetSection("JwtSettings");
var secretKey   = jwtSection["SecretKey"];
var issuer      = jwtSection["Issuer"]!;
var audience    = jwtSection["Audience"]!;

var usesDevelopmentSecret = string.IsNullOrWhiteSpace(secretKey) ||
    secretKey.Contains("Dev_Safe_Placeholder_Key", StringComparison.Ordinal);
if (usesDevelopmentSecret && !builder.Environment.IsDevelopment() &&
    !builder.Environment.IsEnvironment("Testing"))
{
    throw new InvalidOperationException(
        "JwtSettings:SecretKey must be configured with a secure value outside Development.");
}

if (usesDevelopmentSecret)
{
    secretKey = "Dev_Safe_Placeholder_Key_Must_Be_At_Least_32_Chars_Long";
    Console.ForegroundColor = ConsoleColor.Yellow;
    Console.WriteLine("=========================================================================");
    Console.WriteLine("WARNING: Using dev-safe placeholder JWT SecretKey.");
    Console.WriteLine("Please set the actual JWT SecretKey via user-secrets or environment variables.");
    Console.WriteLine("=========================================================================");
    Console.ResetColor();
}

var key         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey!));

// ── Authentication & Authorization ───────────────────────────────────────────
builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
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
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var roleName = context.Principal?.FindFirst(ClaimTypes.Role)?.Value;
                if (!ECommerceBackend.Services.Auth.StaffSessionPolicy.RequiresSingleSession(roleName))
                {
                    return;
                }

                var userIdValue = context.Principal?.FindFirst("userid")?.Value;
                var sessionId = context.Principal?.FindFirst("sessionid")?.Value;
                if (!int.TryParse(userIdValue, out var userId) ||
                    string.IsNullOrWhiteSpace(sessionId))
                {
                    context.HttpContext.Items["StaffSessionReplaced"] = true;
                    context.Fail("Staff session is missing.");
                    return;
                }

                var staffSessionService = context.HttpContext.RequestServices
                    .GetRequiredService<ECommerceBackend.Services.Auth.IStaffSessionService>();
                var isActive = await staffSessionService.IsActiveAsync(
                    userId,
                    sessionId,
                    context.HttpContext.RequestAborted);

                if (!isActive)
                {
                    context.HttpContext.Items["StaffSessionReplaced"] = true;
                    context.Fail("Staff session has been replaced.");
                }
            },
            OnChallenge = async context =>
            {
                if (context.HttpContext.Items.ContainsKey("StaffSessionReplaced"))
                {
                    context.HandleResponse();
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    context.Response.ContentType = "application/json; charset=utf-8";
                    await context.Response.WriteAsJsonAsync(new
                    {
                        message = "Phiên đăng nhập đã được mở trên thiết bị khác. Vui lòng đăng nhập lại.",
                        code = "STAFF_SESSION_REPLACED"
                    });
                }
            }
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
    options.AddPolicy("PasswordResetRequests", httpContext =>
    {
        var remoteIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(
            $"password-reset:{remoteIp}",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(15),
                QueueLimit = 0,
                AutoReplenishment = true
            });
    });
    options.AddPolicy("LoginRequests", httpContext =>
    {
        var remoteIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(
            $"login:{remoteIp}",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            });
    });
    options.AddPolicy("RegistrationOtpRequests", httpContext =>
    {
        var remoteIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(
            $"registration-otp:{remoteIp}",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(15),
                QueueLimit = 0,
                AutoReplenishment = true
            });
    });
    options.AddPolicy("OrderLookupRequests", httpContext =>
    {
        var userId = httpContext.User.FindFirst("userid")?.Value;
        var remoteIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var partitionKey = !string.IsNullOrWhiteSpace(userId)
            ? $"order-lookup:user:{userId}"
            : $"order-lookup:ip:{remoteIp}";

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 8,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            });
    });
});

// ── Singleton Services ────────────────────────────────────────────────────────
// ProductImageStorageService: quản lý file ảnh upload trên server (sản phẩm, tin tức, bảo hành, đổi trả)
builder.Services.AddSingleton<ECommerceBackend.Services.ProductImageStorageService>();

// Runtime services used by authentication, registration and AI consultation.
builder.Services.Configure<ECommerceBackend.Services.Chat.AiAssistantOptions>(
    builder.Configuration.GetSection(ECommerceBackend.Services.Chat.AiAssistantOptions.SectionName));
builder.Services.Configure<ECommerceBackend.Services.Email.EmailOptions>(
    builder.Configuration.GetSection(ECommerceBackend.Services.Email.EmailOptions.SectionName));
builder.Services.AddHttpClient("AiAssistant");
builder.Services.AddScoped<ECommerceBackend.Services.Chat.IProductConsultationService, ECommerceBackend.Services.Chat.ProductConsultationService>();
builder.Services.AddScoped<ECommerceBackend.Services.Chat.IAiProvider, ECommerceBackend.Services.Chat.GroundedAiProvider>();
builder.Services.AddScoped<ECommerceBackend.Services.Chat.IChatOrchestratorService, ECommerceBackend.Services.Chat.ChatOrchestratorService>();
builder.Services.AddScoped<ECommerceBackend.Services.Chat.IChatTypingService, ECommerceBackend.Services.Chat.ChatTypingService>();
builder.Services.AddScoped<ECommerceBackend.Services.Email.IEmailService, ECommerceBackend.Services.Email.SmtpEmailService>();
builder.Services.AddScoped<ECommerceBackend.Services.Email.IRegistrationOtpService, ECommerceBackend.Services.Email.RegistrationOtpService>();
builder.Services.AddScoped<ECommerceBackend.Services.Email.IPasswordResetService, ECommerceBackend.Services.Email.PasswordResetService>();
var redisConnection = builder.Configuration.GetConnectionString("Redis");
if (string.IsNullOrWhiteSpace(redisConnection))
{
    builder.Services.AddDistributedMemoryCache();
}
else
{
    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = redisConnection;
        options.InstanceName = "ECommerce:";
    });
}
builder.Services.AddSingleton<
    ECommerceBackend.Services.Auth.IStaffSessionService,
    ECommerceBackend.Services.Auth.StaffSessionService>();
builder.Services.AddScoped<ECommerceBackend.Services.Checkout.ICheckoutAbuseProtectionService, ECommerceBackend.Services.Checkout.CheckoutAbuseProtectionService>();
builder.Services.AddSingleton<ECommerceBackend.Services.Checkout.IShippingFeePolicy, ECommerceBackend.Services.Checkout.ShippingFeePolicy>();
builder.Services.AddScoped<ECommerceBackend.Services.Returns.IReturnRefundPolicyService, ECommerceBackend.Services.Returns.ReturnRefundPolicyService>();
builder.Services.AddHostedService<ECommerceBackend.Services.Checkout.ExpiredOrderCleanupService>();

// Audit writes are queued by a global action filter and flushed asynchronously.
builder.Services.AddSingleton<ECommerceBackend.Services.AuditLogService>();
builder.Services.AddHostedService(provider =>
    provider.GetRequiredService<ECommerceBackend.Services.AuditLogService>());
builder.Services.AddScoped<ECommerceBackend.Filters.AuditActionFilter>();

// ── Health Checks ─────────────────────────────────────────────────────────────
builder.Services.AddHealthChecks();
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor |
        ForwardedHeaders.XForwardedProto |
        ForwardedHeaders.XForwardedHost;

    // The production backend is expected to be reachable only through Nginx.
    // This also supports Docker networks where the proxy address is dynamic.
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// ── Controllers + JSON + Global Audit Filter ─────────────────────────────────
builder.Services.AddControllers(options =>
    {
        options.Filters.AddService<ECommerceBackend.Filters.AuditActionFilter>();
    })
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler =
            System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.Converters.Add(new UtcDateTimeJsonConverter());
    })
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

var utcConnectionString = connectionString.Contains("Timezone=", StringComparison.OrdinalIgnoreCase)
    ? connectionString
    : $"{connectionString.TrimEnd(';')};Timezone=UTC";

builder.Services.AddDbContext<ECommerceContext>(options =>
    options.UseNpgsql(utcConnectionString));

// ── CORS ──────────────────────────────────────────────────────────────────────
var allowedOrigins = (builder.Configuration["Cors:AllowedOrigins"] ?? string.Empty)
    .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
if (allowedOrigins.Length == 0 && builder.Environment.IsDevelopment())
{
    allowedOrigins =
    [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:4173",
        "http://localhost:3000"
    ];
}

builder.Services.AddCors(options =>
    options.AddPolicy("AllowFrontend", policy =>
    {
        if (allowedOrigins.Length == 0)
        {
            throw new InvalidOperationException(
                "Cors:AllowedOrigins must be configured outside Development.");
        }

        policy.WithOrigins(allowedOrigins)
            .AllowAnyMethod()
            .AllowAnyHeader();
    }));

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
/*
if (!app.Environment.IsEnvironment("Testing"))
{
    await DbInitializer.SeedAsync(app.Services);
}
*/

// ── Middleware pipeline ───────────────────────────────────────────────────────
app.UseForwardedHeaders();
app.UseMiddleware<GlobalExceptionHandlerMiddleware>();
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = context =>
    {
        if (context.Context.Request.Path.StartsWithSegments("/uploads"))
        {
            context.Context.Response.Headers.CacheControl = "public,max-age=31536000,immutable";
        }
    }
});
app.UseAuthentication();   // ← Must come before UseAuthorization
app.UseRateLimiter();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/api/health");

app.Run();

static void LoadEnvironmentFile()
{
    var directory = new DirectoryInfo(Directory.GetCurrentDirectory());
    FileInfo? envFile = null;

    for (var level = 0; directory != null && level < 6; level++, directory = directory.Parent)
    {
        var candidate = new FileInfo(Path.Combine(directory.FullName, ".env"));
        if (candidate.Exists)
        {
            envFile = candidate;
            break;
        }
    }

    if (envFile == null)
    {
        return;
    }

    foreach (var rawLine in File.ReadLines(envFile.FullName))
    {
        var line = rawLine.Trim();
        if (line.Length == 0 || line.StartsWith('#'))
        {
            continue;
        }

        var separatorIndex = line.IndexOf('=');
        if (separatorIndex <= 0)
        {
            continue;
        }

        var key = line[..separatorIndex].Trim();
        var value = line[(separatorIndex + 1)..].Trim();
        if (value.Length >= 2 &&
            ((value.StartsWith('"') && value.EndsWith('"')) ||
             (value.StartsWith('\'') && value.EndsWith('\''))))
        {
            value = value[1..^1];
        }

        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(key)))
        {
            Environment.SetEnvironmentVariable(key, value);
        }
    }
}

public partial class Program { }
