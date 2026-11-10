using Expenn.Api.Application.Common;

namespace Expenn.Api.Domain.Travel;

/// <summary>Routing profiles the API accepts. Anything else is rejected before reaching the provider.</summary>
public static class RouteProfiles
{
    public const string DrivingCar = "driving-car";
    public const string DrivingHgv = "driving-hgv";
    public const string CyclingRegular = "cycling-regular";
    public const string FootWalking = "foot-walking";

    public const string Default = DrivingCar;

    public static readonly IReadOnlyList<string> All = [DrivingCar, DrivingHgv, CyclingRegular, FootWalking];

    public static bool IsValid(string? profile) => profile is not null && All.Contains(profile);

    public static Result Check(string? profile) =>
        IsValid(profile)
            ? Result.Ok()
            : Result.Fail($"Unknown routing profile. Use one of: {string.Join(", ", All)}");
}

/// <summary>Coordinate rules shared by every routing and itinerary endpoint. Points are [lon, lat].</summary>
public static class GeoPoints
{
    public const int MaxDirectionsPoints = 25;
    public const int MaxOptimizePoints = 48;

    public static bool IsValid(double longitude, double latitude) =>
        double.IsFinite(longitude) && double.IsFinite(latitude)
        && longitude is >= -180 and <= 180
        && latitude is >= -90 and <= 90;

    public static bool IsValid(double[]? point) => point is { Length: 2 } && IsValid(point[0], point[1]);

    public static Result Check(IReadOnlyList<double[]>? points, int min, int max)
    {
        if (points is null || points.Count < min || points.Count > max)
            return Result.Fail($"Send between {min} and {max} coordinates");
        for (var i = 0; i < points.Count; i++)
        {
            if (!IsValid(points[i]))
                return Result.Fail($"Coordinate {i + 1} must be [longitude, latitude] with longitude in [-180, 180] and latitude in [-90, 90]");
        }
        return Result.Ok();
    }

    /// <summary>
    /// Reduces a polyline to at most <paramref name="maxPoints"/> points for card thumbnails:
    /// Douglas–Peucker with a growing tolerance, then an even stride as a hard cap.
    /// First and last points are always kept; coordinates are rounded to 5 decimals (~1 m).
    /// </summary>
    public static List<double[]> Downsample(IReadOnlyList<double[]> points, int maxPoints = 48)
    {
        if (points.Count <= maxPoints) return points.Select(Round).ToList();

        var minLon = points.Min(p => p[0]); var maxLon = points.Max(p => p[0]);
        var minLat = points.Min(p => p[1]); var maxLat = points.Max(p => p[1]);
        var tolerance = Math.Max(Math.Sqrt(Math.Pow(maxLon - minLon, 2) + Math.Pow(maxLat - minLat, 2)) / 1000, 1e-6);

        var kept = SimplifyIndices(points, tolerance);
        for (var attempt = 0; kept.Count > maxPoints && attempt < 24; attempt++)
        {
            tolerance *= 2;
            kept = SimplifyIndices(points, tolerance);
        }

        if (kept.Count > maxPoints)
        {
            var strided = new List<int>(maxPoints);
            for (var i = 0; i < maxPoints; i++)
                strided.Add(kept[(int)Math.Round(i * (kept.Count - 1) / (double)(maxPoints - 1))]);
            kept = strided;
        }

        return kept.Select(i => Round(points[i])).ToList();
    }

    private static List<int> SimplifyIndices(IReadOnlyList<double[]> points, double tolerance)
    {
        var keep = new bool[points.Count];
        keep[0] = keep[^1] = true;
        var stack = new Stack<(int Start, int End)>();
        stack.Push((0, points.Count - 1));

        while (stack.Count > 0)
        {
            var (start, end) = stack.Pop();
            var maxDistance = 0d;
            var index = -1;
            for (var i = start + 1; i < end; i++)
            {
                var distance = PerpendicularDistance(points[i], points[start], points[end]);
                if (distance > maxDistance) { maxDistance = distance; index = i; }
            }

            if (index < 0 || maxDistance <= tolerance) continue;
            keep[index] = true;
            stack.Push((start, index));
            stack.Push((index, end));
        }

        var result = new List<int>();
        for (var i = 0; i < keep.Length; i++) if (keep[i]) result.Add(i);
        return result;
    }

    private static double PerpendicularDistance(double[] p, double[] a, double[] b)
    {
        var dx = b[0] - a[0];
        var dy = b[1] - a[1];
        var lengthSquared = dx * dx + dy * dy;
        if (lengthSquared == 0) return Math.Sqrt(Math.Pow(p[0] - a[0], 2) + Math.Pow(p[1] - a[1], 2));
        var t = Math.Clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSquared, 0, 1);
        return Math.Sqrt(Math.Pow(p[0] - (a[0] + t * dx), 2) + Math.Pow(p[1] - (a[1] + t * dy), 2));
    }

    private static double[] Round(double[] p) => [Math.Round(p[0], 5), Math.Round(p[1], 5)];
}
