using System.Text.RegularExpressions;
using Expenn.Api.Data;
using Expenn.Api.Data.Entities;
using Expenn.Api.DTOs.Auth;
using Expenn.Api.DTOs.Organizations;
using Expenn.Api.Services.Auth;
using Expenn.Api.Services.Email;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Expenn.Api.Controllers;

[ApiController]
[Route("api/organizations")]
[Authorize]
public class OrganizationsController(AppDbContext db, IEmailService email, ITokenService tokens) : ControllerBase
{
    private string UserId => User.FindFirst("sub")?.Value ?? string.Empty;
    private string UserEmail => User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value
        ?? User.FindFirst("email")?.Value ?? string.Empty;
    private string OrgId => User.FindFirst("org_id")?.Value ?? string.Empty;
    private string Role => User.FindFirst("role")?.Value ?? "traveler";
    private bool IsAdmin => Role is "owner" or "admin";
    private bool IsManager => Role is "owner" or "admin" or "manager";

    private const int FreeIncludedSeats = 2;

    // ── List user's orgs ──────────────────────────────────────────────────────

    [HttpGet]
    public async Task<ActionResult<List<OrgDto>>> List(CancellationToken ct)
    {
        var orgs = await db.Members
            .Where(m => m.UserId == UserId)
            .Include(m => m.Organization)
            .Select(m => m.Organization)
            .ToListAsync(ct);

        return Ok(orgs.Select(ToDto));
    }

    // ── Create org ────────────────────────────────────────────────────────────

    [HttpPost]
    public async Task<ActionResult<OrgDto>> Create([FromBody] CreateOrgRequest req, CancellationToken ct)
    {
        var slug = string.IsNullOrWhiteSpace(req.Slug) ? await GenerateUniqueSlugAsync(req.Name, ct) : req.Slug;

        if (!string.IsNullOrWhiteSpace(req.Slug))
        {
            var slugExists = await db.Organizations.AnyAsync(o => o.Slug == slug, ct);
            if (slugExists) return Conflict(new { error = "Slug already taken" });
        }

        var org = new Organization
        {
            Name = req.Name,
            Slug = slug,
            AccountType = req.AccountType,
        };
        db.Organizations.Add(org);
        db.Members.Add(new Member { OrganizationId = org.Id, UserId = UserId, Role = req.CreatorRole });

        var team = new Team { OrganizationId = org.Id, Name = "General" };
        db.Teams.Add(team);
        db.TeamMembers.Add(new TeamMember { TeamId = team.Id, UserId = UserId });

        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetBySlug), new { slug = org.Slug }, ToDto(org));
    }

    [HttpGet("{slug}")]
    public async Task<ActionResult<OrgDto>> GetBySlug(string slug, CancellationToken ct)
    {
        var org = await db.Organizations.FirstOrDefaultAsync(o => o.Slug == slug, ct);
        if (org is null) return NotFound();

        var isMember = await db.Members.AnyAsync(m => m.OrganizationId == org.Id && m.UserId == UserId, ct);
        if (!isMember) return Forbid();

        return Ok(ToDto(org));
    }

    private async Task<string> GenerateUniqueSlugAsync(string name, CancellationToken ct)
    {
        var baseSlug = Regex.Replace(name.Trim().ToLowerInvariant(), "[^a-z0-9]+", "-").Trim('-');
        if (string.IsNullOrEmpty(baseSlug)) baseSlug = "workspace";

        var slug = baseSlug;
        var suffix = 1;
        while (await db.Organizations.AnyAsync(o => o.Slug == slug, ct))
        {
            slug = $"{baseSlug}-{++suffix}";
        }
        return slug;
    }

    private static OrgDto ToDto(Organization o) => new(
        o.Id, o.Name, o.Slug, o.Logo, o.AccountType, o.Plan, o.BillingStatus, o.PaidSeats,
        o.PaddleCustomerId, o.PaddleSubscriptionId, o.CurrentPeriodEndsAt, o.CreatedAt);

    // ── Members ───────────────────────────────────────────────────────────────

    [HttpGet("{orgId}/members")]
    public async Task<ActionResult<List<MemberDto>>> GetMembers(string orgId, CancellationToken ct)
    {
        if (!await IsMemberOf(orgId, ct)) return Forbid();

        var members = await db.Members
            .Where(m => m.OrganizationId == orgId)
            .Include(m => m.User)
            .Select(m => new MemberDto(m.Id, m.UserId, m.User.Name, m.User.Email, m.User.Image, m.Role, m.CreatedAt))
            .ToListAsync(ct);

        return Ok(members);
    }

    [HttpPatch("{orgId}/members/{memberId}/role")]
    public async Task<IActionResult> UpdateMemberRole(string orgId, string memberId, [FromBody] UpdateMemberRoleRequest req, CancellationToken ct)
    {
        if (!IsAdmin || OrgId != orgId) return Forbid();

        var member = await db.Members.FirstOrDefaultAsync(m => m.Id == memberId && m.OrganizationId == orgId, ct);
        if (member is null) return NotFound();

        member.Role = req.Role;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{orgId}/members/{memberId}")]
    public async Task<IActionResult> RemoveMember(string orgId, string memberId, CancellationToken ct)
    {
        if (!IsAdmin || OrgId != orgId) return Forbid();

        var member = await db.Members.FirstOrDefaultAsync(m => m.Id == memberId && m.OrganizationId == orgId, ct);
        if (member is null) return NotFound();

        db.Members.Remove(member);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── Invitations ───────────────────────────────────────────────────────────

    [HttpGet("{orgId}/invitations")]
    public async Task<ActionResult<List<InvitationDto>>> GetInvitations(string orgId, CancellationToken ct)
    {
        if (!IsAdmin || OrgId != orgId) return Forbid();

        var invitations = await db.Invitations
            .Where(i => i.OrganizationId == orgId && i.Status == "pending")
            .Select(i => new InvitationDto(i.Id, i.Email, i.Role, i.Status, i.ExpiresAt, i.CreatedAt))
            .ToListAsync(ct);

        return Ok(invitations);
    }

    // ── My pending invitations (across all orgs, by email) ──────────────────────

    [HttpGet("invitations/mine")]
    public async Task<ActionResult<List<MyInvitationDto>>> MyInvitations(CancellationToken ct)
    {
        if (string.IsNullOrEmpty(UserEmail)) return Ok(new List<MyInvitationDto>());

        var invitations = await db.Invitations
            .Where(i => i.Email == UserEmail.ToLowerInvariant() && i.Status == "pending" && i.ExpiresAt > DateTimeOffset.UtcNow)
            .Include(i => i.Organization)
            .Select(i => new MyInvitationDto(
                i.Id, i.Email, i.Role, i.Status, i.ExpiresAt, i.CreatedAt,
                i.OrganizationId, i.Organization.Name, i.Organization.Slug))
            .ToListAsync(ct);

        return Ok(invitations);
    }

    [HttpPost("{orgId}/invitations")]
    public async Task<ActionResult<InvitationDto>> InviteMember(string orgId, [FromBody] InviteMemberRequest req, CancellationToken ct)
    {
        if (!IsAdmin || OrgId != orgId) return Forbid();

        var org = await db.Organizations.FindAsync([orgId], ct);
        if (org is null) return NotFound();

        var alreadyMember = await db.Members
            .Join(db.Users, m => m.UserId, u => u.Id, (m, u) => new { m, u })
            .AnyAsync(x => x.m.OrganizationId == orgId && x.u.Email == req.Email.ToLowerInvariant(), ct);

        if (alreadyMember) return Conflict(new { error = "User is already a member" });

        if (await IsAtSeatLimitAsync(org, ct)) return Conflict(new { error = "Workspace has reached its seat limit" });

        var invitation = new Invitation
        {
            OrganizationId = orgId,
            Email = req.Email.ToLowerInvariant(),
            Role = req.Role,
            InviterId = UserId,
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(7),
        };
        db.Invitations.Add(invitation);
        await db.SaveChangesAsync(ct);

        var inviter = await db.Users.FindAsync([UserId], ct);
        var inviteUrl = $"{Request.Scheme}://{Request.Host}/invite/{invitation.Id}";
        await email.SendInvitationAsync(req.Email, org.Name, inviter?.Name ?? "A team member", inviteUrl, ct);

        return CreatedAtAction(nameof(GetInvitations), new { orgId },
            new InvitationDto(invitation.Id, invitation.Email, invitation.Role, invitation.Status, invitation.ExpiresAt, invitation.CreatedAt));
    }

    [HttpDelete("{orgId}/invitations/{invitationId}")]
    public async Task<IActionResult> CancelInvitation(string orgId, string invitationId, CancellationToken ct)
    {
        if (!IsAdmin || OrgId != orgId) return Forbid();

        var invitation = await db.Invitations.FirstOrDefaultAsync(i => i.Id == invitationId && i.OrganizationId == orgId, ct);
        if (invitation is null) return NotFound();

        invitation.Status = "cancelled";
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{orgId}/invitations/{invitationId}/accept")]
    public async Task<ActionResult<AuthResponse>> AcceptInvitation(string orgId, string invitationId, CancellationToken ct)
    {
        var invitation = await db.Invitations
            .Include(i => i.Organization)
            .FirstOrDefaultAsync(i => i.Id == invitationId && i.OrganizationId == orgId, ct);

        if (invitation is null || invitation.Status != "pending" || invitation.ExpiresAt < DateTimeOffset.UtcNow)
            return BadRequest(new { error = "This invitation is no longer valid" });

        if (!string.Equals(invitation.Email, UserEmail, StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { error = "Sign in with the email address that received the invitation" });

        if (await IsAtSeatLimitAsync(invitation.Organization, ct))
            return Conflict(new { error = "Workspace has reached its seat limit" });

        var member = await db.Members.FirstOrDefaultAsync(m => m.OrganizationId == orgId && m.UserId == UserId, ct);
        if (member is null)
        {
            member = new Member { OrganizationId = orgId, UserId = UserId, Role = invitation.Role };
            db.Members.Add(member);
        }
        else
        {
            member.Role = invitation.Role;
        }

        var defaultTeam = await db.Teams
            .Where(t => t.OrganizationId == orgId)
            .OrderBy(t => t.CreatedAt)
            .FirstOrDefaultAsync(ct);
        if (defaultTeam is not null)
        {
            var alreadyInTeam = await db.TeamMembers.AnyAsync(tm => tm.TeamId == defaultTeam.Id && tm.UserId == UserId, ct);
            if (!alreadyInTeam) db.TeamMembers.Add(new TeamMember { TeamId = defaultTeam.Id, UserId = UserId });
        }

        invitation.Status = "accepted";
        invitation.AcceptedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);

        var user = await db.Users.FindAsync([UserId], ct);
        if (user is null) return Unauthorized();

        var expiresAt = DateTimeOffset.UtcNow.AddDays(30);
        var jwt = tokens.GenerateJwt(user, orgId, member.Role);
        return Ok(new AuthResponse(jwt, expiresAt, new UserDto(user.Id, user.Name, user.Email, user.Image, user.EmailVerified)));
    }

    private async Task<bool> IsAtSeatLimitAsync(Organization org, CancellationToken ct)
    {
        var memberCount = await db.Members.CountAsync(m => m.OrganizationId == org.Id, ct);
        return memberCount >= FreeIncludedSeats + org.PaidSeats;
    }

    // ── Teams ─────────────────────────────────────────────────────────────────

    [HttpGet("{orgId}/teams")]
    public async Task<ActionResult<List<TeamDto>>> GetTeams(string orgId, CancellationToken ct)
    {
        if (!await IsMemberOf(orgId, ct)) return Forbid();

        var teams = await db.Teams
            .Where(t => t.OrganizationId == orgId)
            .Select(t => new TeamDto(t.Id, t.OrganizationId, t.Name, t.CreatedAt))
            .ToListAsync(ct);

        return Ok(teams);
    }

    [HttpPost("{orgId}/teams")]
    public async Task<ActionResult<TeamDto>> CreateTeam(string orgId, [FromBody] CreateTeamRequest req, CancellationToken ct)
    {
        if (!IsAdmin || OrgId != orgId) return Forbid();

        var team = new Team { OrganizationId = orgId, Name = req.Name };
        db.Teams.Add(team);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetTeams), new { orgId },
            new TeamDto(team.Id, team.OrganizationId, team.Name, team.CreatedAt));
    }

    [HttpGet("{orgId}/teams/{teamId}/members")]
    public async Task<ActionResult<List<TeamMemberDto>>> GetTeamMembers(string orgId, string teamId, CancellationToken ct)
    {
        if (!await IsMemberOf(orgId, ct)) return Forbid();

        var members = await db.TeamMembers
            .Where(tm => tm.TeamId == teamId)
            .Include(tm => tm.User)
            .Select(tm => new TeamMemberDto(tm.Id, tm.TeamId, tm.UserId, tm.User.Name, tm.User.Email))
            .ToListAsync(ct);

        return Ok(members);
    }

    [HttpPost("{orgId}/teams/{teamId}/members")]
    public async Task<IActionResult> AddTeamMember(string orgId, string teamId, [FromBody] AddTeamMemberRequest req, CancellationToken ct)
    {
        if (!IsAdmin || OrgId != orgId) return Forbid();

        var isMember = await db.Members.AnyAsync(m => m.OrganizationId == orgId && m.UserId == req.UserId, ct);
        if (!isMember) return BadRequest(new { error = "User is not a member of this organization" });

        var existing = await db.TeamMembers.AnyAsync(tm => tm.TeamId == teamId && tm.UserId == req.UserId, ct);
        if (existing) return Conflict(new { error = "User is already in this team" });

        db.TeamMembers.Add(new TeamMember { TeamId = teamId, UserId = req.UserId });
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{orgId}/teams/{teamId}/members/{userId}")]
    public async Task<IActionResult> RemoveTeamMember(string orgId, string teamId, string userId, CancellationToken ct)
    {
        if (!IsAdmin || OrgId != orgId) return Forbid();

        var tm = await db.TeamMembers.FirstOrDefaultAsync(x => x.TeamId == teamId && x.UserId == userId, ct);
        if (tm is null) return NotFound();

        db.TeamMembers.Remove(tm);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task<bool> IsMemberOf(string orgId, CancellationToken ct) =>
        await db.Members.AnyAsync(m => m.OrganizationId == orgId && m.UserId == UserId, ct);
}
