using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

namespace DebtPricing.Api.Security;

public static class KeycloakExtensions
{
    /// <summary>Validates Keycloak access tokens (signature via the realm's JWKS, issuer, audience, lifetime).</summary>
    public static IServiceCollection AddKeycloakAuthentication(
        this IServiceCollection services, KeycloakOptions keycloak)
    {
        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                // Discovery document + signing keys are fetched from {Authority}/.well-known/openid-configuration
                options.Authority = keycloak.Authority;
                options.RequireHttpsMetadata = keycloak.RequireHttpsMetadata;

                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidAudience = keycloak.Audience,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ClockSkew = TimeSpan.FromSeconds(30),
                    NameClaimType = "preferred_username",
                    RoleClaimType = ClaimTypes.Role
                };

                options.Events = new JwtBearerEvents
                {
                    OnTokenValidated = context =>
                    {
                        if (context.Principal is not null)
                        {
                            KeycloakRoleMapper.AddRoleClaims(context.Principal, keycloak.Audience);
                        }

                        return Task.CompletedTask;
                    }
                };
            });

        return services;
    }

    /// <summary>Adds an "Authorize" button to Swagger UI that logs in through Keycloak (authorization code + PKCE).</summary>
    public static IServiceCollection AddKeycloakSwagger(
        this IServiceCollection services, KeycloakOptions keycloak)
    {
        var openIdConnect = keycloak.Authority.TrimEnd('/') + "/protocol/openid-connect";

        services.AddSwaggerGen(options =>
        {
            options.AddSecurityDefinition("Keycloak", new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.OAuth2,
                Flows = new OpenApiOAuthFlows
                {
                    AuthorizationCode = new OpenApiOAuthFlow
                    {
                        AuthorizationUrl = new Uri(openIdConnect + "/auth"),
                        TokenUrl = new Uri(openIdConnect + "/token"),
                        Scopes = new Dictionary<string, string>
                        {
                            ["openid"] = "OpenID Connect",
                            ["profile"] = "User profile"
                        }
                    }
                }
            });

            options.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.SecurityScheme,
                            Id = "Keycloak"
                        }
                    },
                    new List<string>()
                }
            });
        });

        return services;
    }
}
