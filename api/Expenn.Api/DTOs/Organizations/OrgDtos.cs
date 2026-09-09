namespace Expenn.Api.DTOs.Organizations;

public record CreateOrgRequest(string Name, string? Slug = null, string AccountType = "company", string CreatorRole = "owner");

public record OrgDto(
    string Id,
    string Name,
    string Slug,
    string? Logo,
    string AccountType,
    DateTimeOffset CreatedAt
);

public record MemberDto(
    string Id,
    string UserId,
    string Name,
    string Email,
    string? Image,
    string Role,
    DateTimeOffset CreatedAt
);

public record InviteMemberRequest(string Email, string Role = "traveler");

public record InvitationDto(
    string Id,
    string Email,
    string Role,
    string Status,
    DateTimeOffset ExpiresAt,
    DateTimeOffset CreatedAt
);

public record MyInvitationDto(
    string Id,
    string Email,
    string Role,
    string Status,
    DateTimeOffset ExpiresAt,
    DateTimeOffset CreatedAt,
    string OrganizationId,
    string OrganizationName,
    string OrganizationSlug
);

public record CreateTeamRequest(string Name);

public record TeamDto(
    string Id,
    string OrganizationId,
    string Name,
    DateTimeOffset CreatedAt
);

public record TeamMemberDto(
    string Id,
    string TeamId,
    string UserId,
    string Name,
    string Email
);

public record AddTeamMemberRequest(string UserId);
public record UpdateMemberRoleRequest(string Role);
