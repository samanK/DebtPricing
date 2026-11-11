namespace DebtPricing.Api.Security;

/// <summary>Role names as they appear in the Keycloak access token.</summary>
public static class Roles
{
    /// <summary>May create, update and delete pricing models (and everything a user can do).</summary>
    public const string PricingAdmin = "pricing-admin";

    /// <summary>May read pricing models and call the pricing services.</summary>
    public const string PricingUser = "pricing-user";
}

/// <summary>Authorization policy names used by [Authorize(Policy = ...)].</summary>
public static class Policies
{
    public const string PricingUser = "PricingUser";
    public const string PricingAdmin = "PricingAdmin";
}
