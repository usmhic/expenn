namespace Expenn.Api.Services.Email;

public interface IEmailService
{
    Task SendOtpAsync(string to, string code, CancellationToken ct = default);
    Task SendInvitationAsync(string to, string orgName, string inviterName, string inviteUrl, CancellationToken ct = default);
}
