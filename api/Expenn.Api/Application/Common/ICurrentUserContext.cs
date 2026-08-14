namespace Expenn.Api.Application.Common;

/// <summary>
/// Provides the authenticated user's identity and org context to application-layer handlers.
/// Scoped per-request. Always available inside authenticated endpoints.
/// </summary>
public interface ICurrentUserContext
{
    string UserId { get; }
    string OrgId { get; }
    string Role { get; }

    bool IsAdmin { get; }
    bool IsManager { get; }
    bool IsTraveler { get; }
}
