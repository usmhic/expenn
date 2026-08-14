namespace Expenn.Api.DTOs.Auth;

public record SendOtpRequest(string Email);
public record VerifyOtpRequest(string Email, string Code);
public record LoginRequest(string Email, string Password);
public record AdLoginRequest(string Username, string Password);

public record AuthResponse(
    string AccessToken,
    DateTimeOffset ExpiresAt,
    UserDto User
);

public record UserDto(
    string Id,
    string Name,
    string Email,
    string? Image,
    bool EmailVerified
);

public record MeResponse(
    string Id,
    string Name,
    string Email,
    string? Image,
    string? ActiveOrganizationId,
    string? OrganizationRole,
    string? ActiveOrganizationName = null,
    string? ActiveOrganizationSlug = null
);
