using Microsoft.Extensions.Configuration;

namespace DebtPricing.Api.Security;

public class KeycloakOptions
{
    public const string SectionName = "Keycloak";

    /// <summary>Realm URL, e.g. http://localhost:8080/realms/debt-pricing (Keycloak older than 17: http://localhost:8080/auth/realms/...).</summary>
    public string Authority { get; set; } = string.Empty;

    /// <summary>
    /// Client ID of this API in Keycloak. Tokens must contain it in "aud", and client roles are read from
    /// resource_access[Audience].roles.
    /// </summary>
    public string Audience { get; set; } = string.Empty;

    /// <summary>Must be true outside local development. appsettings.Development.json turns it off for http://localhost.</summary>
    public bool RequireHttpsMetadata { get; set; } = true;

    /// <summary>Public Keycloak client used by the Swagger UI "Authorize" button (authorization code + PKCE).</summary>
    public string SwaggerClientId { get; set; } = "debt-pricing-swagger";

    /// <summary>Reads and validates the "Keycloak" configuration section; fails fast on startup if it is unusable.</summary>
    public static KeycloakOptions Load(IConfiguration configuration)
    {
        var options = configuration.GetSection(SectionName).Get<KeycloakOptions>()
            ?? throw new InvalidOperationException($"Configuration section '{SectionName}' is missing.");

        if (!Uri.TryCreate(options.Authority, UriKind.Absolute, out _))
        {
            throw new InvalidOperationException(
                $"{SectionName}:Authority must be an absolute URL such as http://localhost:8080/realms/<realm>.");
        }

        if (string.IsNullOrWhiteSpace(options.Audience))
        {
            throw new InvalidOperationException($"{SectionName}:Audience (the API's Keycloak client ID) must be set.");
        }

        return options;
    }
}
