using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Expenn.Api.Configuration;
using Expenn.Api.Data;
using Expenn.Api.Data.Entities;
using Expenn.Api.Services.Auth;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Expenn.Api.Controllers;

/// <summary>
/// Implements the OIDC Authorization Code flow for web browsers.
///
/// Flow:
///   1. Client redirects to GET /api/auth/oidc/login?client=web|mobile
///   2. This endpoint redirects the browser to the OIDC provider.
///   3. Provider redirects back to GET /api/auth/oidc/callback?code=...&state=...
///   4. This endpoint exchanges the code, validates the ID token, issues our JWT,
///      then redirects to WebCallbackUrl or MobileCallbackUrl with the token.
/// </summary>
[ApiController]
[Route("api/auth/oidc")]
public class OidcController(
    AppDbContext db,
    ITokenService tokens,
    IOptions<OidcSettings> oidcOpts,
    ILogger<OidcController> logger) : ControllerBase
{
    private readonly OidcSettings _oidc = oidcOpts.Value;
    private const string StateCookieName = "oidc_state";
    private const string NonceCookieName = "oidc_nonce";
    private const string ClientCookieName = "oidc_client";

    // ── Step 1: Start the OIDC flow ─────────────────────────────────────────

    [HttpGet("login")]
    public async Task<IActionResult> Login([FromQuery] string client = "web", CancellationToken ct = default)
    {
        if (!_oidc.Enabled)
            return BadRequest(new { error = "OIDC is not enabled" });

        var discovery = await FetchDiscoveryAsync(ct);
        if (discovery is null)
            return StatusCode(502, new { error = "Could not fetch OIDC discovery document" });

        var state = GenerateRandom();
        var nonce = GenerateRandom();

        // Store state and nonce in short-lived cookies (same-site lax for redirect flows)
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Secure = Request.IsHttps,
            MaxAge = TimeSpan.FromMinutes(10),
            Path = "/api/auth/oidc/callback",
        };

        Response.Cookies.Append(StateCookieName, state, cookieOptions);
        Response.Cookies.Append(NonceCookieName, nonce, cookieOptions);
        Response.Cookies.Append(ClientCookieName, client, cookieOptions);

        var callbackUri = BuildCallbackUri();
        var scopes = Uri.EscapeDataString(_oidc.Scopes);

        var authUrl = $"{discovery.AuthorizationEndpoint}" +
            $"?response_type=code" +
            $"&client_id={Uri.EscapeDataString(_oidc.ClientId)}" +
            $"&redirect_uri={Uri.EscapeDataString(callbackUri)}" +
            $"&scope={scopes}" +
            $"&state={state}" +
            $"&nonce={nonce}";

        return Redirect(authUrl);
    }

    // ── Step 2: Handle callback from OIDC provider ──────────────────────────

    [HttpGet("callback")]
    public async Task<IActionResult> Callback(
        [FromQuery] string? code,
        [FromQuery] string? state,
        [FromQuery] string? error,
        [FromQuery(Name = "error_description")] string? errorDescription,
        CancellationToken ct = default)
    {
        if (!_oidc.Enabled)
            return BadRequest(new { error = "OIDC is not enabled" });

        if (!string.IsNullOrEmpty(error))
        {
            logger.LogWarning("OIDC provider returned error: {Error} — {Description}", error, errorDescription);
            return Redirect(BuildErrorRedirect(errorDescription ?? error));
        }

        // Validate state
        var storedState = Request.Cookies[StateCookieName];
        var storedNonce = Request.Cookies[NonceCookieName];
        var clientHint = Request.Cookies[ClientCookieName] ?? "web";

        ClearStateCookies();

        if (string.IsNullOrEmpty(state) || state != storedState)
        {
            logger.LogWarning("OIDC state mismatch — possible CSRF");
            return Redirect(BuildErrorRedirect("Invalid state parameter"));
        }

        if (string.IsNullOrEmpty(code))
            return Redirect(BuildErrorRedirect("No authorization code received"));

        // Exchange code for tokens
        var discovery = await FetchDiscoveryAsync(ct);
        if (discovery is null)
            return Redirect(BuildErrorRedirect("Could not reach OIDC provider"));

        var tokenResponse = await ExchangeCodeAsync(code, discovery.TokenEndpoint, ct);
        if (tokenResponse is null || string.IsNullOrEmpty(tokenResponse.IdToken))
            return Redirect(BuildErrorRedirect("Token exchange failed"));

        // Validate the ID token per the OIDC spec: signature (via the provider's JWKS),
        // issuer, audience, and expiry — then separately check the nonce claim against
        // the value we generated in Login(). See:
        // https://learn.microsoft.com/entra/identity-platform/id-tokens#validate-tokens
        var jwks = await FetchJwksAsync(discovery.JwksUri, ct);
        if (jwks is null)
            return Redirect(BuildErrorRedirect("Could not verify ID token signature"));

        ClaimsPrincipal principal;
        try
        {
            principal = new JwtSecurityTokenHandler().ValidateToken(tokenResponse.IdToken, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKeys = jwks.GetSigningKeys(),
                ValidateIssuer = true,
                ValidIssuer = discovery.Issuer,
                ValidateAudience = true,
                ValidAudience = _oidc.ClientId,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(2),
            }, out _);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "OIDC ID token validation failed");
            return Redirect(BuildErrorRedirect("Invalid identity token"));
        }

        var tokenNonce = principal.FindFirstValue("nonce");
        if (string.IsNullOrEmpty(tokenNonce) || tokenNonce != storedNonce)
        {
            logger.LogWarning("OIDC nonce mismatch — possible token replay");
            return Redirect(BuildErrorRedirect("Invalid nonce"));
        }

        var email = principal.FindFirstValue("email") ?? principal.FindFirstValue("preferred_username");
        if (string.IsNullOrEmpty(email))
            return Redirect(BuildErrorRedirect("No email in ID token"));

        var name = principal.FindFirstValue("name") ?? email.Split('@')[0];
        var sub = principal.FindFirstValue(JwtRegisteredClaimNames.Sub);

        // Upsert user
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email.ToLowerInvariant(), ct);
        if (user is null)
        {
            user = new User { Name = name, Email = email.ToLowerInvariant(), EmailVerified = true };
            db.Users.Add(user);
            db.Accounts.Add(new Account { AccountId = sub ?? user.Id, ProviderId = "oidc", UserId = user.Id });
            await db.SaveChangesAsync(ct);
        }

        var membership = await db.Members
            .Where(m => m.UserId == user.Id)
            .OrderBy(m => m.CreatedAt)
            .FirstOrDefaultAsync(ct);

        var jwt = tokens.GenerateJwt(user, membership?.OrganizationId ?? string.Empty, membership?.Role ?? "traveler");
        var expiresAt = DateTimeOffset.UtcNow.AddDays(30).ToUnixTimeSeconds();

        // Redirect to the appropriate client with the token
        var destination = clientHint == "mobile" ? _oidc.MobileCallbackUrl : _oidc.WebCallbackUrl;
        var redirectUrl = $"{destination}?token={Uri.EscapeDataString(jwt)}&expires_at={expiresAt}";

        return Redirect(redirectUrl);
    }

    // ── Provider info endpoint (for UI) ────────────────────────────────────

    [HttpGet("info")]
    public IActionResult Info() => Ok(new
    {
        enabled = _oidc.Enabled,
        providerName = _oidc.ProviderName,
        loginUrl = _oidc.Enabled ? $"{Request.Scheme}://{Request.Host}/api/auth/oidc/login" : null,
    });

    // ── Helpers ──────────────────────────────────────────────────────────────

    private string BuildCallbackUri() =>
        $"{Request.Scheme}://{Request.Host}/api/auth/oidc/callback";

    private string BuildErrorRedirect(string message) =>
        $"{_oidc.WebCallbackUrl}?error={Uri.EscapeDataString(message)}";

    private void ClearStateCookies()
    {
        var clear = new CookieOptions { Expires = DateTimeOffset.UtcNow.AddDays(-1), Path = "/api/auth/oidc/callback" };
        Response.Cookies.Append(StateCookieName, "", clear);
        Response.Cookies.Append(NonceCookieName, "", clear);
        Response.Cookies.Append(ClientCookieName, "", clear);
    }

    private static string GenerateRandom() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace("+", "-").Replace("/", "_").TrimEnd('=');

    private async Task<OidcDiscovery?> FetchDiscoveryAsync(CancellationToken ct)
    {
        try
        {
            using var http = new HttpClient();
            var url = _oidc.Authority.TrimEnd('/') + "/.well-known/openid-configuration";
            var json = await http.GetStringAsync(url, ct);
            return JsonSerializer.Deserialize<OidcDiscovery>(json, JsonOpts);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to fetch OIDC discovery document from {Authority}", _oidc.Authority);
            return null;
        }
    }

    private async Task<OidcTokenResponse?> ExchangeCodeAsync(string code, string tokenEndpoint, CancellationToken ct)
    {
        try
        {
            using var http = new HttpClient();
            var body = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "authorization_code",
                ["code"] = code,
                ["redirect_uri"] = BuildCallbackUri(),
                ["client_id"] = _oidc.ClientId,
                ["client_secret"] = _oidc.ClientSecret,
            });

            var credentials = Convert.ToBase64String(
                Encoding.UTF8.GetBytes($"{_oidc.ClientId}:{_oidc.ClientSecret}"));
            http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);

            var res = await http.PostAsync(tokenEndpoint, body, ct);
            if (!res.IsSuccessStatusCode)
            {
                var err = await res.Content.ReadAsStringAsync(ct);
                logger.LogError("OIDC token exchange failed: {Status} {Body}", res.StatusCode, err);
                return null;
            }

            var json = await res.Content.ReadAsStringAsync(ct);
            return JsonSerializer.Deserialize<OidcTokenResponse>(json, JsonOpts);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "OIDC token exchange error");
            return null;
        }
    }

    private async Task<JsonWebKeySet?> FetchJwksAsync(string jwksUri, CancellationToken ct)
    {
        try
        {
            using var http = new HttpClient();
            var json = await http.GetStringAsync(jwksUri, ct);
            return new JsonWebKeySet(json);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to fetch JWKS from {JwksUri}", jwksUri);
            return null;
        }
    }

    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };
}

internal sealed record OidcDiscovery(
    [property: System.Text.Json.Serialization.JsonPropertyName("authorization_endpoint")] string AuthorizationEndpoint,
    [property: System.Text.Json.Serialization.JsonPropertyName("token_endpoint")] string TokenEndpoint,
    [property: System.Text.Json.Serialization.JsonPropertyName("jwks_uri")] string JwksUri,
    [property: System.Text.Json.Serialization.JsonPropertyName("issuer")] string Issuer,
    [property: System.Text.Json.Serialization.JsonPropertyName("userinfo_endpoint")] string? UserinfoEndpoint
);

internal sealed record OidcTokenResponse(
    [property: System.Text.Json.Serialization.JsonPropertyName("access_token")] string? AccessToken,
    [property: System.Text.Json.Serialization.JsonPropertyName("id_token")] string? IdToken,
    [property: System.Text.Json.Serialization.JsonPropertyName("token_type")] string? TokenType
);
