using Expenn.Api.Configuration;
using Microsoft.Extensions.Options;
using Novell.Directory.Ldap;

namespace Expenn.Api.Services.Auth;

public class ActiveDirectoryService(IOptions<ActiveDirectorySettings> opts, ILogger<ActiveDirectoryService> logger) : IActiveDirectoryService
{
    private readonly ActiveDirectorySettings _settings = opts.Value;

    public Task<AdUser?> AuthenticateLdapAsync(string username, string password, CancellationToken ct = default)
    {
        if (!_settings.Enabled || _settings.Mode != "ldap")
            return Task.FromResult<AdUser?>(null);

        try
        {
            using var conn = CreateConnection();

            // Bind with the user's own credentials to validate their password
            var userDn = BuildUserDn(username);
            conn.Bind(userDn, password);

            if (!conn.Bound) return Task.FromResult<AdUser?>(null);

            // Re-bind as service account to read attributes
            conn.Bind(_settings.LdapBindDn, _settings.LdapBindPassword);

            var adUser = SearchUser(conn, username);
            return Task.FromResult(adUser);
        }
        catch (LdapException ex)
        {
            logger.LogWarning("LDAP authentication failed for {Username}: {Message}", username, ex.Message);
            return Task.FromResult<AdUser?>(null);
        }
    }

    public Task<AdUser?> FindLdapUserAsync(string username, CancellationToken ct = default)
    {
        if (!_settings.Enabled || _settings.Mode != "ldap")
            return Task.FromResult<AdUser?>(null);

        try
        {
            using var conn = CreateConnection();
            conn.Bind(_settings.LdapBindDn, _settings.LdapBindPassword);
            var adUser = SearchUser(conn, username);
            return Task.FromResult(adUser);
        }
        catch (LdapException ex)
        {
            logger.LogWarning("LDAP user lookup failed for {Username}: {Message}", username, ex.Message);
            return Task.FromResult<AdUser?>(null);
        }
    }

    private LdapConnection CreateConnection()
    {
        var conn = new LdapConnection { SecureSocketLayer = _settings.LdapSsl };
        conn.Connect(_settings.LdapHost, _settings.LdapPort);
        return conn;
    }

    private string BuildUserDn(string username)
    {
        // If caller passes domain\user or user@domain, strip to samAccountName
        var sam = username.Contains('\\') ? username.Split('\\')[1]
                : username.Contains('@') ? username.Split('@')[0]
                : username;
        return $"CN={sam},{_settings.LdapBaseDn}";
    }

    private AdUser? SearchUser(LdapConnection conn, string username)
    {
        var sam = username.Contains('\\') ? username.Split('\\')[1]
                : username.Contains('@') ? username.Split('@')[0]
                : username;

        var filter = string.Format(_settings.LdapUserSearchFilter, LdapEscape(sam));
        var attrs = new[] { _settings.LdapEmailAttribute, _settings.LdapNameAttribute, "sAMAccountName" };

        var results = conn.Search(
            _settings.LdapBaseDn,
            LdapConnection.ScopeSub,
            filter,
            attrs,
            typesOnly: false
        );

        if (!results.HasMore()) return null;

        var entry = results.Next();
        var email = GetAttr(entry, _settings.LdapEmailAttribute) ?? $"{sam}@{_settings.LdapHost}";
        var name = GetAttr(entry, _settings.LdapNameAttribute) ?? sam;

        return new AdUser(sam, email, name);
    }

    private static string? GetAttr(LdapEntry entry, string attr)
    {
        try { return entry.GetAttribute(attr)?.StringValue; }
        catch { return null; }
    }

    private static string LdapEscape(string value) =>
        value.Replace("\\", "\\5c").Replace("*", "\\2a").Replace("(", "\\28").Replace(")", "\\29").Replace("\0", "\\00");
}
