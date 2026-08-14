using System.Security.Cryptography;
using Expenn.Api.Data;
using Expenn.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Expenn.Api.Services.Auth;

public class OtpService(AppDbContext db) : IOtpService
{
    private const string OtpIdentifierPrefix = "email-otp:";
    private const int OtpExpiryMinutes = 10;

    public async Task<string> CreateOtpAsync(string email, CancellationToken ct = default)
    {
        var code = GenerateCode();
        var identifier = OtpIdentifierPrefix + email.ToLowerInvariant();

        // Remove any existing OTP for this email
        var existing = await db.Verifications
            .Where(v => v.Identifier == identifier)
            .ToListAsync(ct);
        db.Verifications.RemoveRange(existing);

        db.Verifications.Add(new Verification
        {
            Identifier = identifier,
            Value = BCrypt.Net.BCrypt.HashPassword(code),
            ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(OtpExpiryMinutes),
        });

        await db.SaveChangesAsync(ct);
        return code;
    }

    public async Task<bool> VerifyOtpAsync(string email, string code, CancellationToken ct = default)
    {
        var identifier = OtpIdentifierPrefix + email.ToLowerInvariant();

        var verification = await db.Verifications
            .Where(v => v.Identifier == identifier && v.ExpiresAt > DateTimeOffset.UtcNow)
            .FirstOrDefaultAsync(ct);

        if (verification is null) return false;

        var valid = BCrypt.Net.BCrypt.Verify(code, verification.Value);
        if (valid)
        {
            db.Verifications.Remove(verification);
            await db.SaveChangesAsync(ct);
        }

        return valid;
    }

    private static string GenerateCode() =>
        RandomNumberGenerator.GetInt32(100_000, 999_999).ToString();
}
