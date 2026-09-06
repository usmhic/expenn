using System.Text;
using Expenn.Api.Application.Common;
using Expenn.Api.Configuration;
using Expenn.Api.Data;
using Expenn.Api.Infrastructure.Database;
using Expenn.Api.Infrastructure.Messaging;
using Expenn.Api.Infrastructure.Security;
using Expenn.Api.Services.Auth;
using Expenn.Api.Services.Email;
using Expenn.Api.Services.Storage;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Identity.Web;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

// Refuse to boot on missing or unsafe production configuration. Runs before any
// service is registered so the failure names the setting rather than surfacing
// later as a confusing runtime error.
builder.ValidateProductionConfiguration();

// ── Bind strongly-typed settings ──────────────────────────────────────────────

builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("Jwt"));
builder.Services.Configure<ActiveDirectorySettings>(builder.Configuration.GetSection("ActiveDirectory"));
builder.Services.Configure<OidcSettings>(builder.Configuration.GetSection("Oidc"));
builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("Email"));
builder.Services.Configure<StorageSettings>(builder.Configuration.GetSection("Storage"));
builder.Services.Configure<CorsSettings>(builder.Configuration.GetSection("Cors"));
builder.Services.Configure<RabbitMqSettings>(builder.Configuration.GetSection("RabbitMq"));
builder.Services.Configure<BillingSettings>(builder.Configuration.GetSection("Billing"));
builder.Services.Configure<SecuritySettings>(builder.Configuration.GetSection("Security"));

var jwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>()!;
var adSettings = builder.Configuration.GetSection("ActiveDirectory").Get<ActiveDirectorySettings>() ?? new();
var corsSettings = builder.Configuration.GetSection("Cors").Get<CorsSettings>() ?? new();
var rabbitMqSettings = builder.Configuration.GetSection("RabbitMq").Get<RabbitMqSettings>() ?? new();
var securitySettings = builder.Configuration.GetSection("Security").Get<SecuritySettings>() ?? new();

// ── Database ──────────────────────────────────────────────────────────────────

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        npgsql => npgsql.EnableRetryOnFailure(3)
    )
);

// ── Authentication ─────────────────────────────────────────────────────────────
//
//  Scheme 1 — "Bearer"  (default)
//    JWT tokens issued by this API.
//    Used by web (cookie fallback) and mobile (Authorization header).
//
//  Scheme 2 — "AzureAD"  (optional, requires AD Mode = "azure")
//    JWTs issued by Azure AD / Microsoft Entra ID.
//    Allows Entra-issued tokens to be accepted directly without AD login endpoint.
//
//  On-premises AD (LDAP) and generic OIDC are handled in their own controllers
//  — they validate credentials / exchange codes and then issue Scheme 1 JWTs.

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtSettings.Audience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret)),
            ClockSkew = TimeSpan.Zero,
        };

        // Accept the token from either Authorization header or httpOnly cookie
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                if (string.IsNullOrEmpty(ctx.Token))
                    ctx.Token = ctx.Request.Cookies["expenn.token"];
                return Task.CompletedTask;
            },
        };
    });

// Azure AD / Entra ID — opt-in when Mode = "azure" (validates Entra JWTs directly)
if (adSettings is { Enabled: true, Mode: "azure" } && !string.IsNullOrEmpty(adSettings.TenantId))
{
    builder.Services.AddAuthentication()
        .AddMicrosoftIdentityWebApi(
            jwtOptions => { },
            msOptions =>
            {
                msOptions.Instance = "https://login.microsoftonline.com/";
                msOptions.TenantId = adSettings.TenantId;
                msOptions.ClientId = adSettings.ClientId;
                msOptions.ClientSecret = adSettings.ClientSecret;
            },
            jwtBearerScheme: "AzureAD"
        );
}

builder.Services.AddAuthorization();

// ── Current user context ──────────────────────────────────────────────────────
// ICurrentUserContext exposes the JWT claims (userId, orgId, role) to controllers
// and future application-layer handlers without coupling them to HttpContext.

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserContext, CurrentUserContext>();

// ── Services ──────────────────────────────────────────────────────────────────

builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IOtpService, OtpService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IStorageService, StorageService>();
builder.Services.AddScoped<IActiveDirectoryService, ActiveDirectoryService>();

// ── Messaging (MassTransit + RabbitMQ / in-memory) ───────────────────────────

builder.Services.AddExpennMessaging(rabbitMqSettings);

// ── HTTP client (used by OIDC controller) ────────────────────────────────────

builder.Services.AddHttpClient();

// ── Problem Details (RFC 7807) ────────────────────────────────────────────────

builder.Services.AddProblemDetails();

// ── Controllers ───────────────────────────────────────────────────────────────

builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        opts.JsonSerializerOptions.DefaultIgnoreCondition =
            System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

// ── CORS ──────────────────────────────────────────────────────────────────────

builder.Services.AddCors(opts =>
{
    opts.AddPolicy("ExpennClients", policy =>
    {
        var origins = corsSettings.AllowedOrigins.Length > 0
            ? corsSettings.AllowedOrigins
            : ["http://localhost:3000", "http://localhost:8081"];

        policy
            .WithOrigins(origins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// ── Swagger / OpenAPI ─────────────────────────────────────────────────────────

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Expenn API",
        Version = "v1",
        Description = """
            Expense management REST API.

            **Authentication methods**
            - Email OTP — `POST /api/auth/send-otp` → `POST /api/auth/verify-otp`
            - Email/Password — `POST /api/auth/login`
            - Active Directory (LDAP) — `POST /api/auth/ad/login`
            - Azure AD / Entra ID — `POST /api/auth/ad/login` (mode=azure)
            - Generic OIDC (SSO) — `GET /api/auth/oidc/login` (browser redirect)

            All flows return a JWT. Pass it as `Authorization: Bearer <token>`.
            """,
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "JWT from any auth flow above",
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            []
        }
    });
});

// ── Build ─────────────────────────────────────────────────────────────────────

var app = builder.Build();

// Ensure the database exists, then apply pending EF Core migrations — in every
// environment, since this API is the sole owner of the database schema. Set
// SKIP_MIGRATIONS=true when a separate migration step/job handles it instead
// (e.g. to avoid every replica racing to migrate in a multi-instance deployment).
if (builder.Configuration["SKIP_MIGRATIONS"] != "true")
{
    // Best-effort: some managed Postgres hosts don't grant CONNECT on the
    // "postgres" maintenance database, even though the target database itself
    // is reachable. Swallow failures here and let the real connection attempt
    // below surface the actual error if the database truly isn't reachable.
    try
    {
        await DatabaseInitializer.EnsureDatabaseCreatedAsync(
            builder.Configuration.GetConnectionString("DefaultConnection")!);
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Could not verify/create the target database (will proceed anyway)");
    }

    using var scope = app.Services.CreateScope();
    var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")!;
    await using var migrationLock = new NpgsqlConnection(connectionString);
    await migrationLock.OpenAsync();
    await using (var lockCmd = new NpgsqlCommand("SELECT pg_advisory_lock(hashtext(current_database() || ':efcore-migrations'))", migrationLock))
    {
        await lockCmd.ExecuteNonQueryAsync();
    }

    try
    {
        await ctx.Database.MigrateAsync();
    }
    finally
    {
        await using var unlockCmd = new NpgsqlCommand("SELECT pg_advisory_unlock(hashtext(current_database() || ':efcore-migrations'))", migrationLock);
        await unlockCmd.ExecuteNonQueryAsync();
    }
}

// ── Middleware pipeline ───────────────────────────────────────────────────────

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Expenn API v1");
        c.RoutePrefix = "swagger";
        c.DocumentTitle = "Expenn API";
    });
}

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseHttpsRedirection();
app.UseCors("ExpennClients");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.MapGet("/health", () => Results.Ok(new
{
    status = "healthy",
    timestamp = DateTimeOffset.UtcNow,
    environment = app.Environment.EnvironmentName,
}));

app.Run();
