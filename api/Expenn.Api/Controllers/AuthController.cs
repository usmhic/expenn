using Expenn.Api.Data;
using Expenn.Api.Data.Entities;
using Expenn.Api.DTOs.Auth;
using Expenn.Api.Services.Auth;
using Expenn.Api.Services.Email;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Expenn.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    AppDbContext db,
    ITokenService tokens,
    IOtpService otp,
    IEmailService email,
    IActiveDirectoryService ad,
    ILogger<AuthController> logger) : ControllerBase
{
    // ── Email OTP ────────────────────────────────────────────────────────────

    [HttpPost("send-otp")]
    public async Task<IActionResult> SendOtp([FromBody] SendOtpRequest req, CancellationToken ct)
    {
        var normalizedEmail = req.Email.Trim().ToLowerInvariant();
        var code = await otp.CreateOtpAsync(normalizedEmail, ct);

        await email.SendOtpAsync(normalizedEmail, code, ct);

        return Ok(new { message = "OTP sent" });
    }

    [HttpPost("verify-otp")]
    public async Task<ActionResult<AuthResponse>> VerifyOtp([FromBody] VerifyOtpRequest req, CancellationToken ct)
    {
        var normalizedEmail = req.Email.Trim().ToLowerInvariant();
        var valid = await otp.VerifyOtpAsync(normalizedEmail, req.Code.Trim(), ct);
        if (!valid) return Unauthorized(new { error = "Invalid or expired code" });

        var (user, orgId, role) = await GetOrCreateUserAsync(normalizedEmail, normalizedEmail.Split('@')[0], ct);
        return BuildAuthResponse(user, orgId, role);
    }

    // ── Email / Password ──────────────────────────────────────────────────────

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest req, CancellationToken ct)
    {
        var normalizedEmail = req.Email.Trim().ToLowerInvariant();

        var account = await db.Accounts
            .Include(a => a.User)
            .FirstOrDefaultAsync(a => a.User.Email == normalizedEmail && a.ProviderId == "credential", ct);

        if (account is null || account.Password is null)
            return Unauthorized(new { error = "Invalid credentials" });

        if (!BCrypt.Net.BCrypt.Verify(req.Password, account.Password))
            return Unauthorized(new { error = "Invalid credentials" });

        var (orgId, role) = await GetDefaultOrgAsync(account.UserId, ct);
        return BuildAuthResponse(account.User, orgId, role);
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] LoginRequest req, CancellationToken ct)
    {
        var normalizedEmail = req.Email.Trim().ToLowerInvariant();

        var existing = await db.Users.AnyAsync(u => u.Email == normalizedEmail, ct);
        if (existing) return Conflict(new { error = "Email already registered" });

        var user = new User
        {
            Name = normalizedEmail.Split('@')[0],
            Email = normalizedEmail,
            EmailVerified = false,
        };
        db.Users.Add(user);

        db.Accounts.Add(new Account
        {
            AccountId = user.Id,
            ProviderId = "credential",
            UserId = user.Id,
            Password = BCrypt.Net.BCrypt.HashPassword(req.Password),
        });

        await db.SaveChangesAsync(ct);
        return BuildAuthResponse(user, string.Empty, "traveler");
    }

    // ── Active Directory ──────────────────────────────────────────────────────

    [HttpPost("ad/login")]
    public async Task<ActionResult<AuthResponse>> AdLogin([FromBody] AdLoginRequest req, CancellationToken ct)
    {
        var adUser = await ad.AuthenticateLdapAsync(req.Username, req.Password, ct);
        if (adUser is null)
            return Unauthorized(new { error = "Active Directory authentication failed" });

        var normalizedEmail = adUser.Email.ToLowerInvariant();
        var (user, orgId, role) = await GetOrCreateUserAsync(normalizedEmail, adUser.DisplayName, ct, "ad");
        return BuildAuthResponse(user, orgId, role);
    }

    // ── Current User ──────────────────────────────────────────────────────────

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<MeResponse>> Me(CancellationToken ct)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                  ?? User.FindFirst("sub")?.Value;

        if (userId is null) return Unauthorized();

        var orgId = User.FindFirst("org_id")?.Value;
        var role = User.FindFirst("role")?.Value;

        var user = await db.Users.FindAsync([userId], ct);
        if (user is null) return NotFound();

        string? orgName = null, orgSlug = null;
        if (!string.IsNullOrEmpty(orgId))
        {
            var org = await db.Organizations.FindAsync([orgId], ct);
            orgName = org?.Name;
            orgSlug = org?.Slug;
        }

        return Ok(new MeResponse(user.Id, user.Name, user.Email, user.Image, orgId, role, orgName, orgSlug));
    }

    [Authorize]
    [HttpPost("logout")]
    public IActionResult Logout()
    {
        // JWT is stateless; client discards the token.
        // For session-token based clients, they delete the token locally.
        return Ok(new { message = "Logged out" });
    }

    // ── Switch active organization ────────────────────────────────────────────

    [Authorize]
    [HttpPost("switch-org")]
    public async Task<ActionResult<AuthResponse>> SwitchOrg([FromBody] SwitchOrgRequest req, CancellationToken ct)
    {
        var userId = User.FindFirst("sub")?.Value ?? string.Empty;

        var membership = await db.Members
            .Include(m => m.User)
            .FirstOrDefaultAsync(m => m.UserId == userId && m.OrganizationId == req.OrganizationId, ct);

        if (membership is null) return Forbid();

        return BuildAuthResponse(membership.User, membership.OrganizationId, membership.Role);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<(User user, string orgId, string role)> GetOrCreateUserAsync(
        string email, string name, CancellationToken ct, string provider = "email")
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);

        if (user is null)
        {
            user = new User { Name = name, Email = email, EmailVerified = true };
            db.Users.Add(user);

            db.Accounts.Add(new Account
            {
                AccountId = user.Id,
                ProviderId = provider,
                UserId = user.Id,
            });

            await db.SaveChangesAsync(ct);
        }

        var (orgId, role) = await GetDefaultOrgAsync(user.Id, ct);
        return (user, orgId, role);
    }

    private async Task<(string orgId, string role)> GetDefaultOrgAsync(string userId, CancellationToken ct)
    {
        var membership = await db.Members
            .Where(m => m.UserId == userId)
            .OrderBy(m => m.CreatedAt)
            .FirstOrDefaultAsync(ct);

        return (membership?.OrganizationId ?? string.Empty, membership?.Role ?? "traveler");
    }

    private AuthResponse BuildAuthResponse(User user, string orgId, string role)
    {
        var expiresAt = DateTimeOffset.UtcNow.AddDays(30);
        var jwt = tokens.GenerateJwt(user, orgId, role);
        return new AuthResponse(
            jwt,
            expiresAt,
            new UserDto(user.Id, user.Name, user.Email, user.Image, user.EmailVerified)
        );
    }
}

public record SwitchOrgRequest(string OrganizationId);
