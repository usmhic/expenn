namespace Expenn.Api.Configuration;

public class JwtSettings
{
    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = "expenn-api";
    public string Audience { get; set; } = "expenn-clients";
    public int ExpirationDays { get; set; } = 30;
}

public class ActiveDirectorySettings
{
    public bool Enabled { get; set; }
    public string Mode { get; set; } = "ldap"; // "ldap" | "azure"

    // LDAP / on-premises AD
    public string LdapHost { get; set; } = string.Empty;
    public int LdapPort { get; set; } = 389;
    public bool LdapSsl { get; set; }
    public string LdapBaseDn { get; set; } = string.Empty;
    public string LdapBindDn { get; set; } = string.Empty;
    public string LdapBindPassword { get; set; } = string.Empty;
    public string LdapUserSearchFilter { get; set; } = "(&(objectClass=user)(sAMAccountName={0}))";
    public string LdapEmailAttribute { get; set; } = "mail";
    public string LdapNameAttribute { get; set; } = "displayName";

    // Azure AD / Microsoft Entra ID
    public string TenantId { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
}

public class EmailSettings
{
    public string From { get; set; } = "Expenn <noreply@expenn.app>";
    public string SmtpHost { get; set; } = string.Empty;
    public int SmtpPort { get; set; } = 587;
    public string SmtpUser { get; set; } = string.Empty;
    public string SmtpPassword { get; set; } = string.Empty;
    public bool SmtpSsl { get; set; } = true;
    // Resend HTTP API (alternative to SMTP)
    public string ResendApiKey { get; set; } = string.Empty;
}

public class StorageSettings
{
    public string Endpoint { get; set; } = string.Empty;
    public string PublicUrl { get; set; } = string.Empty;
    public string AccessKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
    public string Bucket { get; set; } = "expenn";
    public bool UsePathStyle { get; set; } = true;
    public int MaxSizeMb { get; set; } = 12;
}

public class CorsSettings
{
    public string[] AllowedOrigins { get; set; } = [];
}

public class OidcSettings
{
    public bool Enabled { get; set; }

    /// <summary>Display name shown on the sign-in button (e.g. "Contoso SSO").</summary>
    public string ProviderName { get; set; } = "SSO";

    /// <summary>OIDC issuer / authority base URL (without /.well-known/openid-configuration).</summary>
    public string Authority { get; set; } = string.Empty;

    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;

    /// <summary>Space-separated OIDC scopes.</summary>
    public string Scopes { get; set; } = "openid email profile";

    /// <summary>Where the API redirects after successful OIDC login on the web.</summary>
    public string WebCallbackUrl { get; set; } = "http://localhost:3000/auth/oidc-callback";

    /// <summary>Where the API redirects after successful OIDC login on mobile (deep link).</summary>
    public string MobileCallbackUrl { get; set; } = "expenn://auth/oidc-callback";
}
