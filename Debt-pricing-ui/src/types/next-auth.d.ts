import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    /** Keycloak access token, used server-side to call the DebtPricing API. */
    accessToken?: string;
    /** Realm roles + client roles of the API client, as seen in the access token. */
    roles: string[];
    /** Set when the access token could not be refreshed; the user must sign in again. */
    error?: "RefreshTokenError";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    /** Access token expiry, seconds since epoch. */
    expiresAt?: number;
    roles?: string[];
    error?: "RefreshTokenError";
  }
}
