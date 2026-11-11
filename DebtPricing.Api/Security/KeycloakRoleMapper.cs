using System.Security.Claims;
using System.Text.Json;

namespace DebtPricing.Api.Security;

/// <summary>
/// Keycloak does not put roles in a standard claim. Realm roles are in the JSON claim
/// "realm_access": {"roles":[...]} and client roles in "resource_access": {"&lt;clientId&gt;":{"roles":[...]}}.
/// This copies realm roles and the roles of this API's own client into ClaimTypes.Role so that
/// RequireRole / [Authorize(Roles=...)] / User.IsInRole work.
/// </summary>
public static class KeycloakRoleMapper
{
    public static void AddRoleClaims(ClaimsPrincipal principal, string clientId)
    {
        if (principal.Identity is not ClaimsIdentity identity)
        {
            return;
        }

        var present = new HashSet<string>(
            identity.FindAll(ClaimTypes.Role).Select(c => c.Value), StringComparer.Ordinal);

        var roles = ReadRoles(identity, "realm_access", null)
            .Concat(ReadRoles(identity, "resource_access", clientId));

        foreach (var role in roles)
        {
            if (present.Add(role))
            {
                identity.AddClaim(new Claim(ClaimTypes.Role, role));
            }
        }
    }

    // path: realm_access -> roles            (clientId == null)
    //       resource_access -> <clientId> -> roles
    private static IEnumerable<string> ReadRoles(ClaimsIdentity identity, string claimType, string? clientId)
    {
        var raw = identity.FindFirst(claimType)?.Value;
        if (string.IsNullOrWhiteSpace(raw))
        {
            yield break;
        }

        JsonDocument document;
        try
        {
            document = JsonDocument.Parse(raw);
        }
        catch (JsonException)
        {
            yield break; // malformed claim: grant nothing
        }

        using (document)
        {
            var node = document.RootElement;

            if (clientId is not null)
            {
                if (node.ValueKind != JsonValueKind.Object || !node.TryGetProperty(clientId, out node))
                {
                    yield break;
                }
            }

            if (node.ValueKind != JsonValueKind.Object ||
                !node.TryGetProperty("roles", out var rolesElement) ||
                rolesElement.ValueKind != JsonValueKind.Array)
            {
                yield break;
            }

            foreach (var item in rolesElement.EnumerateArray())
            {
                if (item.ValueKind == JsonValueKind.String && !string.IsNullOrEmpty(item.GetString()))
                {
                    yield return item.GetString()!;
                }
            }
        }
    }
}
