using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using ECommerceBackend.Models;
using ECommerceBackend.Data;
using ECommerceBackend.Services;
using ECommerceBackend.Filters;
using ECommerceBackend.DTOs.Common;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);

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

// ── Audit Log (Singleton background service + scoped filter) ─────────────────────
builder.Services.AddSingleton<AuditLogService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<AuditLogService>());
builder.Services.AddScoped<AuditActionFilter>();

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
await DbInitializer.SeedAsync(app.Services);

// ── Middleware pipeline ───────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseHttpsRedirection();
app.UseAuthentication();   // ← Must come before UseAuthorization
app.UseAuthorization();
app.MapControllers();

app.Run();