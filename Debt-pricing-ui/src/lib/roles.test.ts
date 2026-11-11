import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { canUsePricing, extractRoles, isAdmin } from "./roles";

async function token(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).sign(new TextEncoder().encode("test-secret-test-secret-test-secret"));
}

describe("extractRoles", () => {
  it("reads realm roles and the API client's roles only", async () => {
    const jwt = await token({
      realm_access: { roles: ["offline_access", "pricing-user"] },
      resource_access: {
        "debt-pricing-api": { roles: ["pricing-admin"] },
        account: { roles: ["manage-account"] },
      },
    });
    expect(extractRoles(jwt, "debt-pricing-api").sort()).toEqual(["offline_access", "pricing-admin", "pricing-user"]);
  });

  it("de-duplicates and ignores junk", async () => {
    const jwt = await token({
      realm_access: { roles: ["pricing-user", "pricing-user", 5, ""] },
      resource_access: { "debt-pricing-api": { roles: "not-an-array" } },
    });
    expect(extractRoles(jwt, "debt-pricing-api")).toEqual(["pricing-user"]);
  });

  it("returns [] for missing or malformed tokens", async () => {
    expect(extractRoles(undefined, "x")).toEqual([]);
    expect(extractRoles("not.a.jwt", "x")).toEqual([]);
    expect(extractRoles(await token({}), "x")).toEqual([]);
  });
});

describe("role helpers", () => {
  it("distinguishes admin, user and none", () => {
    expect(isAdmin({ roles: ["pricing-admin"] })).toBe(true);
    expect(isAdmin({ roles: ["pricing-user"] })).toBe(false);
    expect(canUsePricing({ roles: ["pricing-user"] })).toBe(true);
    expect(canUsePricing({ roles: ["pricing-admin"] })).toBe(true);
    expect(canUsePricing({ roles: ["other"] })).toBe(false);
    expect(canUsePricing(null)).toBe(false);
  });
});
