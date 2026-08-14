using Expenn.Api.Configuration;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using System.Net.Http.Headers;
using System.Text.Json;

namespace Expenn.Api.Services.Email;

public class EmailService(IOptions<EmailSettings> opts, ILogger<EmailService> logger) : IEmailService
{
    private readonly EmailSettings _settings = opts.Value;

    public async Task SendOtpAsync(string to, string code, CancellationToken ct = default)
    {
        var subject = $"Your Expenn sign-in code: {code}";
        var html = $"""
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
              <h2 style="color:#111">Sign in to Expenn</h2>
              <p>Use this code to sign in. It expires in 10 minutes.</p>
              <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#6366f1;margin:24px 0">{code}</div>
              <p style="color:#666;font-size:13px">If you did not request this, you can safely ignore this email.</p>
            </div>
            """;

        await SendAsync(to, subject, html, ct);
    }

    public async Task SendInvitationAsync(string to, string orgName, string inviterName, string inviteUrl, CancellationToken ct = default)
    {
        var subject = $"{inviterName} invited you to {orgName} on Expenn";
        var html = $"""
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
              <h2 style="color:#111">You've been invited</h2>
              <p><strong>{inviterName}</strong> invited you to join <strong>{orgName}</strong> on Expenn.</p>
              <a href="{inviteUrl}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0">Accept invitation</a>
              <p style="color:#666;font-size:13px">This invitation expires in 7 days.</p>
            </div>
            """;

        await SendAsync(to, subject, html, ct);
    }

    private async Task SendAsync(string to, string subject, string html, CancellationToken ct)
    {
        if (!string.IsNullOrEmpty(_settings.ResendApiKey))
        {
            await SendViaResendAsync(to, subject, html, ct);
            return;
        }

        if (string.IsNullOrEmpty(_settings.SmtpHost))
        {
            logger.LogWarning("Email not sent — no SMTP or Resend configured. To: {To} Subject: {Subject}", to, subject);
            return;
        }

        await SendViaSmtpAsync(to, subject, html, ct);
    }

    private async Task SendViaSmtpAsync(string to, string subject, string html, CancellationToken ct)
    {
        var message = new MimeMessage();
        message.From.Add(MailboxAddress.Parse(_settings.From));
        message.To.Add(MailboxAddress.Parse(to));
        message.Subject = subject;
        message.Body = new TextPart("html") { Text = html };

        using var client = new SmtpClient();
        var secureOption = _settings.SmtpSsl ? SecureSocketOptions.StartTls : SecureSocketOptions.None;
        await client.ConnectAsync(_settings.SmtpHost, _settings.SmtpPort, secureOption, ct);

        if (!string.IsNullOrEmpty(_settings.SmtpUser))
            await client.AuthenticateAsync(_settings.SmtpUser, _settings.SmtpPassword, ct);

        await client.SendAsync(message, ct);
        await client.DisconnectAsync(true, ct);
    }

    private async Task SendViaResendAsync(string to, string subject, string html, CancellationToken ct)
    {
        using var http = new HttpClient();
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ResendApiKey);

        var payload = JsonSerializer.Serialize(new { from = _settings.From, to = new[] { to }, subject, html });
        var content = new StringContent(payload, System.Text.Encoding.UTF8, "application/json");

        var response = await http.PostAsync("https://api.resend.com/emails", content, ct);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            logger.LogError("Resend API error {Status}: {Body}", response.StatusCode, body);
        }
    }
}
