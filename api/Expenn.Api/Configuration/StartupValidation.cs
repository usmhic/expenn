using System.Text.RegularExpressions;

namespace Expenn.Api.Configuration;

/// <summary>
/// Fails the process at boot when production configuration is missing or unsafe.
/// A misconfigured API that starts is far worse than one that refuses to: an empty
/// JWT secret, for instance, would sign tokens anyone could forge.
/// </summary>
public static partial class StartupValidation
{
    private const int MinJwtSecretLength = 32;

    public static void ValidateProductionConfiguration(this WebApplicationBuilder builder)
    {
        // Development is allowed to run on defaults so `dotnet run` stays frictionless.
        if (builder.Environment.IsDevelopment()) return;

        var errors = new List<string>();

        var jwt = builder.Configuration.GetSection("Jwt").Get<JwtSettings>() ?? new JwtSettings();
        if (string.IsNullOrWhiteSpace(jwt.Secret))
            errors.Add("Jwt__Secret is not set.");
        else if (jwt.Secret.Length < MinJwtSecretLength)
            errors.Add($"Jwt__Secret must be at least {MinJwtSecretLength} characters (got {jwt.Secret.Length}).");
        else if (WeakSecretPattern().IsMatch(jwt.Secret))
            errors.Add("Jwt__Secret looks like a placeholder value. Generate a random secret.");

        if (string.IsNullOrWhiteSpace(builder.Configuration.GetConnectionString("DefaultConnection")))
            errors.Add("ConnectionStrings__DefaultConnection is not set.");

        var cors = builder.Configuration.GetSection("Cors").Get<CorsSettings>() ?? new CorsSettings();
        if (cors.AllowedOrigins.Length == 0)
            errors.Add("Cors__AllowedOrigins__0 is not set. Production must not fall back to localhost origins.");
        foreach (var origin in cors.AllowedOrigins)
        {
            if (origin == "*")
                errors.Add("Cors__AllowedOrigins may not contain '*' — credentialed CORS forbids a wildcard origin.");
            else if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                errors.Add($"Cors__AllowedOrigins contains an invalid origin: '{origin}'.");
            else if (uri.Scheme == "http" && !uri.IsLoopback)
                errors.Add($"Cors__AllowedOrigins contains a non-loopback http origin: '{origin}'. Use https.");
        }

        // Storage is required for receipts and travel documents — the two things
        // this product exists to hold.
        var storage = builder.Configuration.GetSection("Storage").Get<StorageSettings>() ?? new StorageSettings();
        if (string.IsNullOrWhiteSpace(storage.Endpoint)) errors.Add("Storage__Endpoint is not set.");
        if (string.IsNullOrWhiteSpace(storage.AccessKey)) errors.Add("Storage__AccessKey is not set.");
        if (string.IsNullOrWhiteSpace(storage.SecretKey)) errors.Add("Storage__SecretKey is not set.");

        var ad = builder.Configuration.GetSection("ActiveDirectory").Get<ActiveDirectorySettings>() ?? new();
        if (ad is { Enabled: true, Mode: "ldap" })
        {
            if (string.IsNullOrWhiteSpace(ad.LdapHost)) errors.Add("ActiveDirectory__LdapHost is required when LDAP mode is enabled.");
            if (!ad.LdapSsl) errors.Add("ActiveDirectory__LdapSsl must be true in production — LDAP simple bind sends credentials in cleartext otherwise.");
        }
        if (ad is { Enabled: true, Mode: "azure" } && string.IsNullOrWhiteSpace(ad.TenantId))
            errors.Add("ActiveDirectory__TenantId is required when Azure AD mode is enabled.");

        var oidc = builder.Configuration.GetSection("Oidc").Get<OidcSettings>() ?? new();
        if (oidc.Enabled)
        {
            if (string.IsNullOrWhiteSpace(oidc.Authority)) errors.Add("Oidc__Authority is required when OIDC is enabled.");
            if (string.IsNullOrWhiteSpace(oidc.ClientId)) errors.Add("Oidc__ClientId is required when OIDC is enabled.");
            if (string.IsNullOrWhiteSpace(oidc.ClientSecret)) errors.Add("Oidc__ClientSecret is required when OIDC is enabled.");
        }

        if (builder.Configuration["AllowedHosts"] is "*" or null)
            errors.Add("AllowedHosts must name the API's hostnames in production (e.g. 'api.expenn.osas.cloud').");

        if (errors.Count == 0) return;

        throw new InvalidOperationException(
            $"Expenn API cannot start in {builder.Environment.EnvironmentName}: " +
            $"{errors.Count} configuration problem(s).{Environment.NewLine}  - " +
            string.Join($"{Environment.NewLine}  - ", errors));
    }

    [GeneratedRegex("^(changeme|secret|password|test|dev|placeholder|your[-_]?secret)",
        RegexOptions.IgnoreCase)]
    private static partial Regex WeakSecretPattern();
}
