import type { NextRequest } from "next/server";
import { handlers } from "@/auth";

export const { POST } = handlers;

/**
 * Auth.js endpoints. GET /api/auth/session is readable by browser JavaScript, so the Keycloak access
 * token (which only server code needs, via auth()) is removed from that response. The token itself stays
 * in the encrypted, httpOnly session cookie.
 */
export async function GET(request: NextRequest) {
  const response = await handlers.GET(request);
  if (!request.nextUrl.pathname.endsWith("/session")) return response;

  let session: unknown;
  try {
    session = await response.clone().json();
  } catch {
    return response;
  }
  if (session && typeof session === "object") {
    delete (session as Record<string, unknown>).accessToken;
  }

  const headers = new Headers();
  for (const cookie of response.headers.getSetCookie()) headers.append("set-cookie", cookie);
  headers.set("content-type", "application/json");
  headers.set("cache-control", "private, no-cache, no-store");
  return new Response(JSON.stringify(session), { status: response.status, headers });
}
