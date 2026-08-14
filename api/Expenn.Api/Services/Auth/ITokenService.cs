using Expenn.Api.Data.Entities;

namespace Expenn.Api.Services.Auth;

public interface ITokenService
{
    string GenerateJwt(User user, string organizationId, string role);
    (string userId, string orgId, string role)? ValidateJwt(string token);
    string GenerateSessionToken();
}
