using Expenn.Api.Domain.Travel;
using Expenn.Api.DTOs.Routing;
using Expenn.Api.Services.Routing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Expenn.Api.Controllers;

/// <summary>
/// Place search and route planning. Routing is optional: without an OpenRouteService key
/// these endpoints answer 503 and <c>GET /api/routing/status</c> reports <c>enabled: false</c>.
/// Provider failures surface as 502 with a user-facing <c>error</c>.
/// </summary>
[ApiController]
[Route("api")]
[Authorize]
public class RoutingController(IRoutingService routing) : ControllerBase
{
    private const int MinQueryLength = 2;

    [HttpGet("routing/status")]
    public ActionResult<RoutingStatusDto> Status() => Ok(new RoutingStatusDto(routing.IsEnabled, RouteProfiles.All));

    // ── Places ────────────────────────────────────────────────────────────────

    [HttpGet("places/search")]
    public async Task<ActionResult<List<PlaceDto>>> SearchPlaces(
        [FromQuery] string? q, [FromQuery] double? lat, [FromQuery] double? lon, [FromQuery] int limit = 6,
        CancellationToken ct = default)
    {
        if (!routing.IsEnabled) return NotConfigured();
        if ((q?.Trim().Length ?? 0) < MinQueryLength) return Ok(new List<PlaceDto>());
        if (lat is not null && lon is not null && !GeoPoints.IsValid(lon.Value, lat.Value))
            return BadRequest(new { error = "Focus point needs a latitude in [-90, 90] and a longitude in [-180, 180]" });

        var result = await routing.SearchPlacesAsync(q!, lat, lon, Math.Clamp(limit, 1, 10), ct);
        return result.IsSuccess ? Ok(result.Value) : ProviderError(result.Error);
    }

    [HttpGet("places/reverse")]
    public async Task<ActionResult<PlaceDto>> ReversePlace([FromQuery] double? lat, [FromQuery] double? lon, CancellationToken ct)
    {
        if (!routing.IsEnabled) return NotConfigured();
        if (lat is null || lon is null || !GeoPoints.IsValid(lon.Value, lat.Value))
            return BadRequest(new { error = "Send lat in [-90, 90] and lon in [-180, 180]" });

        var result = await routing.ReversePlaceAsync(lat.Value, lon.Value, ct);
        if (result.IsFailure) return ProviderError(result.Error);
        return result.Value is null ? NotFound(new { error = "No place found at this location" }) : Ok(result.Value);
    }

    // ── Routes ────────────────────────────────────────────────────────────────

    [HttpPost("routing/directions")]
    public async Task<ActionResult<RouteOptionsDto>> Directions([FromBody] DirectionsRequest req, CancellationToken ct)
    {
        if (!routing.IsEnabled) return NotConfigured();
        var invalid = Validate(req.Profile, req.Coordinates, GeoPoints.MaxDirectionsPoints);
        if (invalid is not null) return BadRequest(new { error = invalid });

        var result = await routing.GetDirectionsAsync(req.Profile!, req.Coordinates!, req.Alternatives, ct);
        return result.IsSuccess ? Ok(result.Value) : ProviderError(result.Error);
    }

    /// <summary>
    /// Best visiting order for the points, as a permutation of their indices. With keepStart the
    /// first point stays first; with keepEnd the last stays last. The provider needs an anchor, so
    /// when neither is kept the route still starts from the first point.
    /// </summary>
    [HttpPost("routing/optimize")]
    public async Task<ActionResult<OptimizeResultDto>> Optimize([FromBody] OptimizeRequest req, CancellationToken ct)
    {
        if (!routing.IsEnabled) return NotConfigured();
        var invalid = Validate(req.Profile, req.Coordinates, GeoPoints.MaxOptimizePoints);
        if (invalid is not null) return BadRequest(new { error = invalid });

        var points = req.Coordinates!;
        var n = points.Count;
        var identity = Enumerable.Range(0, n).ToList();
        if (n < 3) return Ok(new OptimizeResultDto(identity));

        var anchorStart = req.KeepStart || !req.KeepEnd;
        var anchorEnd = req.KeepEnd;
        var middle = identity.Where(i => !(anchorStart && i == 0) && !(anchorEnd && i == n - 1)).ToList();
        if (middle.Count < 2) return Ok(new OptimizeResultDto(identity));

        var result = await routing.OptimizeOrderAsync(
            req.Profile!,
            anchorStart ? points[0] : null,
            anchorEnd ? points[n - 1] : null,
            middle.Select(i => points[i]).ToList(),
            ct);
        if (result.IsFailure) return ProviderError(result.Error);

        var order = new List<int>(n);
        if (anchorStart) order.Add(0);
        order.AddRange(result.Value.Select(i => middle[i]));
        if (anchorEnd) order.Add(n - 1);
        return Ok(new OptimizeResultDto(order));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static string? Validate(string? profile, List<double[]>? coordinates, int maxPoints)
    {
        var profileCheck = RouteProfiles.Check(profile);
        if (profileCheck.IsFailure) return profileCheck.Error;
        var pointsCheck = GeoPoints.Check(coordinates, 2, maxPoints);
        return pointsCheck.IsFailure ? pointsCheck.Error : null;
    }

    private ObjectResult NotConfigured() =>
        StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = RoutingErrors.NotConfigured });

    private ObjectResult ProviderError(string error) =>
        error == RoutingErrors.NotConfigured
            ? NotConfigured()
            : StatusCode(StatusCodes.Status502BadGateway, new { error });
}
