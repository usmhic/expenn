using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Expenn.Api.Application.Common;
using Expenn.Api.Configuration;
using Expenn.Api.Domain.Travel;
using Expenn.Api.DTOs.Routing;
using Microsoft.Extensions.Options;

namespace Expenn.Api.Services.Routing;

/// <summary>
/// OpenRouteService client: Pelias geocoding, directions (GeoJSON) and VROOM optimization.
/// The API key travels in the Authorization header and is never logged.
/// </summary>
public sealed class OpenRouteServiceClient(
    IHttpClientFactory httpClientFactory,
    IOptions<OpenRouteServiceSettings> options,
    ILogger<OpenRouteServiceClient> logger) : IRoutingService
{
    public const string HttpClientName = "OpenRouteService";
    private const int MaxProviderMessageLength = 300;

    private static readonly JsonSerializerOptions RequestJson = new(JsonSerializerDefaults.Web);

    public bool IsEnabled => options.Value.Enabled;

    /// <summary>Applies base address, timeout and credentials to the named HttpClient.</summary>
    public static void Configure(HttpClient http, OpenRouteServiceSettings settings)
    {
        var baseUrl = Uri.TryCreate(settings.BaseUrl?.TrimEnd('/') + "/", UriKind.Absolute, out var parsed)
            ? parsed
            : new Uri("https://api.openrouteservice.org/");
        http.BaseAddress = baseUrl;
        http.Timeout = TimeSpan.FromSeconds(Math.Clamp(settings.TimeoutSeconds, 1, 120));
        http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/geo+json"));
        if (settings.Enabled)
            http.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", settings.ApiKey.Trim());
    }

    // ── Geocoding ─────────────────────────────────────────────────────────────

    public async Task<Result<List<PlaceDto>>> SearchPlacesAsync(
        string text, double? focusLat, double? focusLon, int size, CancellationToken ct = default)
    {
        var query = new StringBuilder("geocode/autocomplete?text=").Append(Uri.EscapeDataString(text.Trim()))
            .Append("&size=").Append(Math.Clamp(size, 1, 10).ToString(CultureInfo.InvariantCulture));
        if (focusLat is { } lat && focusLon is { } lon && GeoPoints.IsValid(lon, lat))
            query.Append("&focus.point.lat=").Append(Format(lat)).Append("&focus.point.lon=").Append(Format(lon));

        var response = await SendAsync(HttpMethod.Get, query.ToString(), body: null, ct);
        if (response.IsFailure) return Result<List<PlaceDto>>.Fail(response.Error);
        using var doc = response.Value;
        return ParsePlaces(doc.RootElement);
    }

    public async Task<Result<PlaceDto?>> ReversePlaceAsync(double lat, double lon, CancellationToken ct = default)
    {
        var response = await SendAsync(HttpMethod.Get,
            $"geocode/reverse?point.lat={Format(lat)}&point.lon={Format(lon)}&size=1", body: null, ct);
        if (response.IsFailure) return Result<PlaceDto?>.Fail(response.Error);
        using var doc = response.Value;
        return Result<PlaceDto?>.Ok(ParsePlaces(doc.RootElement).FirstOrDefault());
    }

    private static List<PlaceDto> ParsePlaces(JsonElement root)
    {
        var places = new List<PlaceDto>();
        if (!root.TryGetProperty("features", out var features) || features.ValueKind != JsonValueKind.Array) return places;

        foreach (var feature in features.EnumerateArray())
        {
            if (!TryReadPoint(feature, out var lon, out var lat)) continue;
            var props = feature.TryGetProperty("properties", out var p) && p.ValueKind == JsonValueKind.Object ? p : default;
            var name = Str(props, "name") ?? Str(props, "label") ?? "Unnamed place";
            places.Add(new PlaceDto(
                Str(props, "gid") ?? Str(props, "id") ?? $"{Format(lat)},{Format(lon)}",
                name,
                Str(props, "label") ?? name,
                Str(props, "locality"),
                Str(props, "region"),
                Str(props, "country"),
                Str(props, "country_a"),
                lat,
                lon,
                Str(props, "layer")));
        }
        return places;
    }

    private static bool TryReadPoint(JsonElement feature, out double lon, out double lat)
    {
        lon = lat = 0;
        if (!feature.TryGetProperty("geometry", out var geometry)
            || !geometry.TryGetProperty("coordinates", out var coords)
            || coords.ValueKind != JsonValueKind.Array || coords.GetArrayLength() < 2) return false;
        lon = coords[0].GetDouble();
        lat = coords[1].GetDouble();
        return true;
    }

    // ── Directions ────────────────────────────────────────────────────────────

    public async Task<Result<RouteOptionsDto>> GetDirectionsAsync(
        string profile, IReadOnlyList<double[]> coordinates, bool alternatives, CancellationToken ct = default)
    {
        var profileCheck = RouteProfiles.Check(profile);
        if (profileCheck.IsFailure) return Result<RouteOptionsDto>.Fail(profileCheck.Error);
        var pointsCheck = GeoPoints.Check(coordinates, 2, GeoPoints.MaxDirectionsPoints);
        if (pointsCheck.IsFailure) return Result<RouteOptionsDto>.Fail(pointsCheck.Error);

        var body = new Dictionary<string, object>
        {
            ["coordinates"] = coordinates.Select(c => new[] { c[0], c[1] }).ToList(),
            ["units"] = "m",
            ["instructions"] = false,
        };
        if (alternatives && coordinates.Count == 2)
            body["alternative_routes"] = new { target_count = 3, share_factor = 0.6, weight_factor = 1.4 };

        var response = await SendAsync(HttpMethod.Post, $"v2/directions/{profile}/geojson", body, ct);
        if (response.IsFailure) return Result<RouteOptionsDto>.Fail(response.Error);
        using var doc = response.Value;

        var root = doc.RootElement;
        var collectionBbox = ReadBbox(root);
        var routes = new List<RouteDto>();
        if (root.TryGetProperty("features", out var features) && features.ValueKind == JsonValueKind.Array)
        {
            foreach (var feature in features.EnumerateArray())
                routes.Add(ParseRoute(feature, collectionBbox));
        }

        if (routes.Count == 0) return Result<RouteOptionsDto>.Fail("No route found between these stops");
        return new RouteOptionsDto(profile, routes);
    }

    private static RouteDto ParseRoute(JsonElement feature, double[]? collectionBbox)
    {
        var line = new List<double[]>();
        if (feature.TryGetProperty("geometry", out var geometry)
            && geometry.TryGetProperty("coordinates", out var coords) && coords.ValueKind == JsonValueKind.Array)
        {
            foreach (var c in coords.EnumerateArray())
                if (c.ValueKind == JsonValueKind.Array && c.GetArrayLength() >= 2)
                    line.Add([c[0].GetDouble(), c[1].GetDouble()]);
        }

        double distance = 0, duration = 0;
        var legs = new List<RouteLegDto>();
        var wayPoints = new List<int>();
        if (feature.TryGetProperty("properties", out var props) && props.ValueKind == JsonValueKind.Object)
        {
            if (props.TryGetProperty("summary", out var summary) && summary.ValueKind == JsonValueKind.Object)
            {
                distance = Num(summary, "distance");
                duration = Num(summary, "duration");
            }
            if (props.TryGetProperty("segments", out var segments) && segments.ValueKind == JsonValueKind.Array)
            {
                foreach (var segment in segments.EnumerateArray())
                    legs.Add(new RouteLegDto(Num(segment, "distance"), Num(segment, "duration")));
            }
            if (props.TryGetProperty("way_points", out var wp) && wp.ValueKind == JsonValueKind.Array)
            {
                foreach (var index in wp.EnumerateArray())
                    if (index.TryGetInt32(out var i)) wayPoints.Add(i);
            }
        }

        if (legs.Count == 0) legs = EstimateLegs(line, wayPoints, distance, duration);
        return new RouteDto(distance, duration, GeoJsonLineString.From(line), legs, ReadBbox(feature) ?? collectionBbox);
    }

    /// <summary>
    /// Fallback when the provider omits per-segment summaries: splits the geometry at the
    /// way points and shares the route totals out by great-circle length.
    /// </summary>
    private static List<RouteLegDto> EstimateLegs(List<double[]> line, List<int> wayPoints, double distance, double duration)
    {
        if (wayPoints.Count < 2 || line.Count < 2 || wayPoints.Any(i => i < 0 || i >= line.Count)) return [];

        var lengths = new List<double>();
        for (var w = 1; w < wayPoints.Count; w++)
        {
            double length = 0;
            for (var i = wayPoints[w - 1] + 1; i <= wayPoints[w]; i++) length += Haversine(line[i - 1], line[i]);
            lengths.Add(length);
        }

        var total = lengths.Sum();
        if (total <= 0) return lengths.Select(_ => new RouteLegDto(0, 0)).ToList();
        return lengths.Select(l => new RouteLegDto(distance * l / total, duration * l / total)).ToList();
    }

    private static double Haversine(double[] a, double[] b)
    {
        const double earthRadiusMeters = 6_371_000;
        static double Rad(double deg) => deg * Math.PI / 180;
        var dLat = Rad(b[1] - a[1]);
        var dLon = Rad(b[0] - a[0]);
        var h = Math.Pow(Math.Sin(dLat / 2), 2) + Math.Cos(Rad(a[1])) * Math.Cos(Rad(b[1])) * Math.Pow(Math.Sin(dLon / 2), 2);
        return 2 * earthRadiusMeters * Math.Asin(Math.Min(1, Math.Sqrt(h)));
    }

    private static double[]? ReadBbox(JsonElement element)
    {
        if (!element.TryGetProperty("bbox", out var bbox) || bbox.ValueKind != JsonValueKind.Array) return null;
        var values = bbox.EnumerateArray().Where(v => v.ValueKind == JsonValueKind.Number).Select(v => v.GetDouble()).ToArray();
        // 3D boxes are [minLon, minLat, minEle, maxLon, maxLat, maxEle]; keep the 2D corners.
        return values.Length switch
        {
            4 => values,
            6 => [values[0], values[1], values[3], values[4]],
            _ => null,
        };
    }

    // ── Optimization ──────────────────────────────────────────────────────────

    public async Task<Result<List<int>>> OptimizeOrderAsync(
        string profile, double[]? start, double[]? end, IReadOnlyList<double[]> stops, CancellationToken ct = default)
    {
        var profileCheck = RouteProfiles.Check(profile);
        if (profileCheck.IsFailure) return Result<List<int>>.Fail(profileCheck.Error);
        var pointsCheck = GeoPoints.Check(stops, 1, GeoPoints.MaxOptimizePoints);
        if (pointsCheck.IsFailure) return Result<List<int>>.Fail(pointsCheck.Error);
        if (start is null && end is null) return Result<List<int>>.Fail("Optimization needs a start or an end point");
        if ((start is not null && !GeoPoints.IsValid(start)) || (end is not null && !GeoPoints.IsValid(end)))
            return Result<List<int>>.Fail("Start and end must be [longitude, latitude]");

        var vehicle = new Dictionary<string, object> { ["id"] = 1, ["profile"] = profile };
        if (start is not null) vehicle["start"] = start;
        if (end is not null) vehicle["end"] = end;

        var body = new
        {
            // VROOM ids are 1-based here so they map back to stops[id - 1].
            jobs = stops.Select((s, i) => new { id = i + 1, location = new[] { s[0], s[1] } }).ToList(),
            vehicles = new[] { vehicle },
        };

        var response = await SendAsync(HttpMethod.Post, "optimization", body, ct);
        if (response.IsFailure) return Result<List<int>>.Fail(response.Error);
        using var doc = response.Value;

        var order = new List<int>();
        var seen = new HashSet<int>();
        void Add(JsonElement element, string property)
        {
            if (element.TryGetProperty(property, out var idElement) && idElement.TryGetInt32(out var id)
                && id >= 1 && id <= stops.Count && seen.Add(id - 1))
                order.Add(id - 1);
        }

        var root = doc.RootElement;
        if (root.TryGetProperty("routes", out var routes) && routes.ValueKind == JsonValueKind.Array && routes.GetArrayLength() > 0
            && routes[0].TryGetProperty("steps", out var steps) && steps.ValueKind == JsonValueKind.Array)
        {
            foreach (var step in steps.EnumerateArray())
            {
                if (Str(step, "type") != "job") continue;
                if (step.TryGetProperty("id", out _)) Add(step, "id");
                else Add(step, "job");
            }
        }

        // Unassigned jobs (and anything the provider dropped) keep their original relative order.
        for (var i = 0; i < stops.Count; i++)
            if (seen.Add(i)) order.Add(i);

        return order;
    }

    // ── Transport ─────────────────────────────────────────────────────────────

    private async Task<Result<JsonDocument>> SendAsync(HttpMethod method, string path, object? body, CancellationToken ct)
    {
        if (!IsEnabled) return Result<JsonDocument>.Fail(RoutingErrors.NotConfigured);

        var http = httpClientFactory.CreateClient(HttpClientName);
        using var request = new HttpRequestMessage(method, path);
        if (body is not null)
            request.Content = new StringContent(JsonSerializer.Serialize(body, RequestJson), Encoding.UTF8, "application/json");

        var endpoint = path.Split('?')[0];
        try
        {
            using var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
            if (!response.IsSuccessStatusCode)
            {
                var message = await DescribeFailureAsync(response, ct);
                logger.LogWarning("OpenRouteService {Endpoint} returned {Status}: {Message}",
                    endpoint, (int)response.StatusCode, message);
                return Result<JsonDocument>.Fail(message);
            }

            await using var stream = await response.Content.ReadAsStreamAsync(ct);
            return await JsonDocument.ParseAsync(stream, cancellationToken: ct);
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            logger.LogWarning("OpenRouteService {Endpoint} timed out", endpoint);
            return Result<JsonDocument>.Fail("The routing provider did not respond in time, try again");
        }
        catch (HttpRequestException ex)
        {
            logger.LogWarning(ex, "OpenRouteService {Endpoint} could not be reached", endpoint);
            return Result<JsonDocument>.Fail("The routing provider could not be reached, try again shortly");
        }
        catch (JsonException ex)
        {
            logger.LogWarning(ex, "OpenRouteService {Endpoint} returned malformed JSON", endpoint);
            return Result<JsonDocument>.Fail("The routing provider sent an unexpected response");
        }
    }

    private static async Task<string> DescribeFailureAsync(HttpResponseMessage response, CancellationToken ct)
    {
        switch (response.StatusCode)
        {
            case HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden:
                return "The routing provider rejected the API key";
            case HttpStatusCode.NotFound:
                return "No route found between these stops";
            case HttpStatusCode.TooManyRequests:
                return "Routing provider rate limit reached, try again shortly";
        }

        string? message = null;
        try
        {
            var text = await response.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(text);
            var root = doc.RootElement;
            if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("error", out var error))
            {
                // Directions: { error: { code, message } }; optimization: { code, error: "..." }.
                message = error.ValueKind switch
                {
                    JsonValueKind.Object => Str(error, "message"),
                    JsonValueKind.String => error.GetString(),
                    _ => null,
                };
            }
            message ??= root.ValueKind == JsonValueKind.Object ? Str(root, "message") : null;
        }
        catch (JsonException)
        {
            // Not JSON (e.g. a proxy error page); fall through to the generic message.
        }

        if (string.IsNullOrWhiteSpace(message))
            return $"The routing provider returned an error (HTTP {(int)response.StatusCode})";
        message = message.Trim();
        return message.Length > MaxProviderMessageLength ? message[..MaxProviderMessageLength] + "…" : message;
    }

    // ── JSON helpers ──────────────────────────────────────────────────────────

    private static string? Str(JsonElement element, string property) =>
        element.ValueKind == JsonValueKind.Object && element.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;

    private static double Num(JsonElement element, string property) =>
        element.ValueKind == JsonValueKind.Object && element.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.Number
            ? value.GetDouble()
            : 0;

    private static string Format(double value) => value.ToString("R", CultureInfo.InvariantCulture);
}
