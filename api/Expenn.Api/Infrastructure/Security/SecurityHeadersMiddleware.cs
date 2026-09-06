namespace Expenn.Api.Infrastructure.Security;

/// <summary>
/// Adds the response headers a JSON API should always carry. Deliberately narrow:
/// this service serves API responses (and, when explicitly enabled, Swagger UI),
/// so the CSP is a lockdown rather than a page policy.
/// </summary>
public sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var headers = context.Response.Headers;

        headers["X-Content-Type-Options"] = "nosniff";
        headers["X-Frame-Options"] = "DENY";
        headers["Referrer-Policy"] = "no-referrer";
        headers["Cross-Origin-Opener-Policy"] = "same-origin";
        headers["Cross-Origin-Resource-Policy"] = "same-site";
        headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), interest-cohort=()";

        // Swagger UI needs to load its own scripts/styles; everything else gets
        // a policy that permits nothing at all.
        var isSwagger = context.Request.Path.StartsWithSegments("/swagger");
        headers["Content-Security-Policy"] = isSwagger
            ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'"
            : "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

        // Never let a proxy or browser cache an authenticated API response.
        if (!headers.ContainsKey("Cache-Control"))
            headers["Cache-Control"] = "no-store";

        // Don't advertise the stack.
        headers.Remove("Server");
        headers.Remove("X-Powered-By");

        await next(context);
    }
}

public static class SecurityHeadersMiddlewareExtensions
{
    public static IApplicationBuilder UseExpennSecurityHeaders(this IApplicationBuilder app)
        => app.UseMiddleware<SecurityHeadersMiddleware>();
}
