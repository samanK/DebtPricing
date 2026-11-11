import { describe, expect, it } from "vitest";
import { apiErrorFromResponse } from "./api-error";

describe("apiErrorFromResponse", () => {
  it("maps ASP.NET validation problems to camelCase field errors", () => {
    const error = apiErrorFromResponse(400, {
      title: "One or more validation errors occurred.",
      errors: { BaseRate: ["Out of range."], "$.seniorShare": ["Bad", "Worse"] },
    });
    expect(error.status).toBe(400);
    expect(error.fieldErrors).toEqual({ baseRate: "Out of range.", seniorShare: "Bad Worse" });
    expect(error.userMessage).toBe("Out of range.");
  });

  it("uses ProblemDetails title and detail", () => {
    const error = apiErrorFromResponse(409, { title: "Pricing model name already exists", detail: "A pricing model named 'X' already exists." });
    expect(error.title).toBe("Pricing model name already exists");
    expect(error.userMessage).toBe("A pricing model named 'X' already exists.");
  });

  it("explains 401 and 403 when the body is empty", () => {
    expect(apiErrorFromResponse(401, null).detail).toMatch(/audience/i);
    expect(apiErrorFromResponse(403, null).detail).toMatch(/pricing-user/);
    expect(apiErrorFromResponse(500, null).title).toMatch(/500/);
  });
});
