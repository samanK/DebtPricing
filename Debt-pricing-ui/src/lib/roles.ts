import { decodeJwt } from "jose";

export const ADMIN_ROLE = "pricing-admin";
export const USER_ROLE = "pricing-user";

interface KeycloakTokenPayload {
  realm_access?: { roles?: unknown };
  resource_access?: Record<string, { roles?: unknown } | undefined>;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && v.length > 0) : [];
}

/**
 * Mirrors the API's role mapping: realm roles (realm_access.roles) plus the roles of the API's own
 * client (resource_access[clientId].roles). Roles of other clients are ignored.
 * The token is not verified here - it comes straight from Keycloak's token endpoint - and the API
 * enforces the real authorization; this is only used to show/hide UI.
 */
export function extractRoles(accessToken: string | undefined, apiClientId: string): string[] {
  if (!accessToken) return [];
  try {
    const payload = decodeJwt(accessToken) as KeycloakTokenPayload;
    const roles = [
      ...stringArray(payload.realm_access?.roles),
      ...stringArray(payload.resource_access?.[apiClientId]?.roles),
    ];
    return [...new Set(roles)];
  } catch {
    return [];
  }
}

type WithRoles = { roles?: string[] } | null | undefined;

export function isAdmin(session: WithRoles): boolean {
  return !!session?.roles?.includes(ADMIN_ROLE);
}

export function canUsePricing(session: WithRoles): boolean {
  return isAdmin(session) || !!session?.roles?.includes(USER_ROLE);
}
