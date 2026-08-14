namespace Expenn.Api.Services.Auth;

public interface IOtpService
{
    Task<string> CreateOtpAsync(string email, CancellationToken ct = default);
    Task<bool> VerifyOtpAsync(string email, string code, CancellationToken ct = default);
}
