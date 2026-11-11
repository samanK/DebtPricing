import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import type { JWT } from "next-auth/jwt";
import { extractRoles } from "@/lib/roles";

const apiClientId = process.env.DEBTPRICING_API_CLIENT_ID ?? "debt-pricing-api";

/** Refresh slightly before the access token really expires. */
const EXPIRY_SKEW_SECONDS = 10;

function oidcEndpoint(path: "token" | "logout"): string {
  const issuer = process.env.AUTH_KEYCLOAK_ISSUER;
  if (!issuer) throw new Error("AUTH_KEYCLOAK_ISSUER is not set.");
  return `${issuer.replace(/\/+$/, "")}/protocol/openid-connect/${path}`;
}

function clientCredentials(): Record<string, string> {
  const client_id = process.env.AUTH_KEYCLOAK_ID;
  const client_secret = process.env.AUTH_KEYCLOAK_SECRET;
  if (!client_id) throw new Error("AUTH_KEYCLOAK_ID is not set.");
  return client_secret ? { client_id, client_secret } : { client_id };
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const response = await fetch(oidcEndpoint("token"), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        ...clientCredentials(),
        grant_type: "refresh_token",
        refresh_token: token.refreshToken ?? "",
      }),
    });

    const data = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!response.ok || !data.access_token) throw new Error(`Token refresh failed (${response.status}).`);

    return {
      ...token,
      accessToken: data.access_token,
      // Keycloak may rotate the refresh token; keep the old one if it did not send a new one.
      refreshToken: data.refresh_token ?? token.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in ?? 300),
      roles: extractRoles(data.access_token, apiClientId),
      error: undefined,
    };
  } catch (error) {
    console.error("Keycloak token refresh failed:", error);
    return { ...token, error: "RefreshTokenError" };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Client ID / secret / issuer are read from AUTH_KEYCLOAK_ID / AUTH_KEYCLOAK_SECRET / AUTH_KEYCLOAK_ISSUER.
  providers: [Keycloak],
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    async jwt({ token, account }) {
      // First call after a successful sign-in: keep the tokens issued by Keycloak.
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
          roles: extractRoles(account.access_token, apiClientId),
          error: undefined,
        };
      }

      if (token.expiresAt && Date.now() < (token.expiresAt - EXPIRY_SKEW_SECONDS) * 1000) {
        return token;
      }
      if (!token.refreshToken) return { ...token, error: "RefreshTokenError" };
      return refreshAccessToken(token);
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.roles = token.roles ?? [];
      session.error = token.error;
      return session;
    },

    // Used by the proxy (src/proxy.ts): unauthenticated or expired sessions are sent to /signin.
    authorized({ auth }) {
      return !!auth?.user && !auth.error;
    },
  },
  events: {
    // End the Keycloak SSO session too (back-channel logout with the refresh token).
    async signOut(message) {
      if (!("token" in message) || !message.token?.refreshToken) return;
      try {
        const response = await fetch(oidcEndpoint("logout"), {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ ...clientCredentials(), refresh_token: message.token.refreshToken }),
        });
        if (!response.ok) {
          console.error(`Keycloak logout returned ${response.status}: ${await response.text()}`);
        }
      } catch (error) {
        console.error("Keycloak logout failed:", error);
      }
    },
  },
});
