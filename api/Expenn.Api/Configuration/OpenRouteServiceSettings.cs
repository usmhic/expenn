namespace Expenn.Api.Configuration;

/// <summary>
/// Optional route planning and place search through OpenRouteService.
/// Bound from the "OpenRouteService" section (env vars: OpenRouteService__ApiKey, …).
/// Without an API key the API still runs; routing endpoints answer 503.
/// </summary>
public class OpenRouteServiceSettings
{
    public string ApiKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.openrouteservice.org";
    public int TimeoutSeconds { get; set; } = 10;

    public bool Enabled => !string.IsNullOrWhiteSpace(ApiKey);
}
