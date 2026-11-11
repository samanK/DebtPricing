using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;

namespace DebtPricing.Api.Security;

public static class AuthorizationSetup
{
    /// <summary>
    /// PricingUser  = pricing-user or pricing-admin.
    /// PricingAdmin = pricing-admin only.
    /// Fallback policy: any endpoint without an explicit policy still requires an authenticated user.
    /// </summary>
    public static IServiceCollection AddDebtPricingAuthorization(this IServiceCollection services)
    {
        services.AddAuthorizationBuilder()
            .AddPolicy(Policies.PricingUser, policy => policy
                .RequireAuthenticatedUser()
                .RequireRole(Roles.PricingAdmin, Roles.PricingUser))
            .AddPolicy(Policies.PricingAdmin, policy => policy
                .RequireAuthenticatedUser()
                .RequireRole(Roles.PricingAdmin))
            .SetFallbackPolicy(new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build());

        return services;
    }
}
