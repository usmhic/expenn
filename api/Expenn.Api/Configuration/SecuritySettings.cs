namespace Expenn.Api.Configuration;

/// <summary>
/// Production security knobs. Bound from the "Security" configuration section
/// (env vars: Security__EnableSwagger, Security__Hsts__MaxAgeDays, …).
/// </summary>
public class SecuritySettings
{
    /// <summary>Expose Swagger UI outside Development. Off by default — the schema
    /// describes every auth flow and is not something to publish by accident.</summary>
    public bool EnableSwagger { get; set; }

    /// <summary>Emit HSTS. Only meaningful once the API is reached over TLS.</summary>
    public bool EnableHsts { get; set; } = true;

    /// <summary>HSTS max-age. 365 days is the value Play/browsers expect for preload.</summary>
    public int HstsMaxAgeDays { get; set; } = 365;

    /// <summary>Trust X-Forwarded-* headers. Required when running behind a reverse
    /// proxy (Caddy/nginx/Traefik) so scheme, host and client IP are correct.</summary>
    public bool UseForwardedHeaders { get; set; } = true;

    /// <summary>Proxy addresses to trust. Empty means "trust any proxy", which is
    /// correct only when nothing but the proxy can reach this container.</summary>
    public string[] KnownProxies { get; set; } = [];

    public RateLimitSettings RateLimit { get; set; } = new();
}

public class RateLimitSettings
{
    public bool Enabled { get; set; } = true;

    /// <summary>Requests per window for general authenticated API traffic, per user
    /// (or per client IP when anonymous).</summary>
    public int PermitLimit { get; set; } = 300;

    public int WindowSeconds { get; set; } = 60;

    /// <summary>Much tighter budget for the credential and OTP endpoints, which are
    /// the ones worth brute-forcing.</summary>
    public int AuthPermitLimit { get; set; } = 10;

    public int AuthWindowSeconds { get; set; } = 60;
}
