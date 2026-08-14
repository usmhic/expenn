namespace Expenn.Api.Services.Auth;

public record AdUser(string Username, string Email, string DisplayName);

public interface IActiveDirectoryService
{
    /// <summary>Authenticate against on-premises AD via LDAP. Returns the AD user on success.</summary>
    Task<AdUser?> AuthenticateLdapAsync(string username, string password, CancellationToken ct = default);

    /// <summary>Look up an AD user by UPN / samAccountName without validating credentials.</summary>
    Task<AdUser?> FindLdapUserAsync(string username, CancellationToken ct = default);
}
