using System.Security.Claims;
using Microsoft.AspNetCore.Http;

namespace Expenn.Api.Application.Common;

public sealed class CurrentUserContext(IHttpContextAccessor httpContextAccessor) : ICurrentUserContext
{
    private ClaimsPrincipal? User => httpContextAccessor.HttpContext?.User;

    public string UserId => User?.FindFirst("sub")?.Value ?? string.Empty;
    public string OrgId => User?.FindFirst("org_id")?.Value ?? string.Empty;
    public string Role => User?.FindFirst("role")?.Value ?? "traveler";

    public bool IsAdmin => Role is "owner" or "admin";
    public bool IsManager => Role is "owner" or "admin" or "manager";
    public bool IsTraveler => !IsManager;
}
