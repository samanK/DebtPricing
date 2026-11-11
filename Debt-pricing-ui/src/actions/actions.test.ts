import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, apiMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  apiMock: {
    createModel: vi.fn(),
    updateModel: vi.fn(),
    deleteModel: vi.fn(),
    priceSimple: vi.fn(),
    priceTranche: vi.fn(),
  },
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/api", () => ({ api: apiMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

import { ApiError } from "@/lib/api-error";
import { createModelAction, deleteModelAction, updateModelAction } from "./pricing-models";
import { priceSimpleAction, priceTrancheAction } from "./pricing";

const admin = { user: { name: "alice" }, roles: ["pricing-admin"] };
const plainUser = { user: { name: "bob" }, roles: ["pricing-user"] };

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

const modelForm = {
  name: "AutoLoan-Standard",
  description: "",
  isActive: "on",
  baseRate: "27",
  creditSpread: "3",
  prepaymentAdjustment: "1",
  liquidityPremium: "2",
  regulatoryRateCap: "30",
  servicingFeeRate: "1.2",
  seniorShare: "80",
  seniorDiscountRate: "28",
  juniorDiscountRate: "45",
};

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(admin);
});

describe("createModelAction", () => {
  it("sends fractions to the API and redirects", async () => {
    apiMock.createModel.mockResolvedValue({});
    await expect(createModelAction({}, form(modelForm))).rejects.toThrow("NEXT_REDIRECT:/pricing-models?notice=created");
    expect(apiMock.createModel).toHaveBeenCalledWith(
      expect.objectContaining({ name: "AutoLoan-Standard", description: null, baseRate: 0.27, servicingFeeRate: 0.012, seniorShare: 0.8, isActive: true }),
    );
  });

  it("does not call the API when validation fails", async () => {
    const state = await createModelAction({}, form({ ...modelForm, baseRate: "abc" }));
    expect(state.fieldErrors?.baseRate).toBeDefined();
    expect(state.values?.baseRate).toBe("abc");
    expect(apiMock.createModel).not.toHaveBeenCalled();
  });

  it("maps a duplicate-name conflict onto the name field", async () => {
    apiMock.createModel.mockRejectedValue(new ApiError(409, "Pricing model name already exists", "A pricing model named 'AutoLoan-Standard' already exists."));
    const state = await createModelAction({}, form(modelForm));
    expect(state.fieldErrors?.name).toMatch(/already exists/);
    expect(state.values?.name).toBe("AutoLoan-Standard");
  });

  it("refuses non-admins without calling the API", async () => {
    authMock.mockResolvedValue(plainUser);
    const state = await createModelAction({}, form(modelForm));
    expect(state.message).toMatch(/pricing-admin/);
    expect(apiMock.createModel).not.toHaveBeenCalled();
  });

  it("sends signed-out users to /signin", async () => {
    authMock.mockResolvedValue(null);
    await expect(createModelAction({}, form(modelForm))).rejects.toThrow("NEXT_REDIRECT:/signin");
  });

  it("lets unexpected errors propagate", async () => {
    apiMock.createModel.mockRejectedValue(new Error("boom"));
    await expect(createModelAction({}, form(modelForm))).rejects.toThrow("boom");
  });
});

describe("updateModelAction / deleteModelAction", () => {
  it("updates by id", async () => {
    apiMock.updateModel.mockResolvedValue({});
    await expect(updateModelAction(7, {}, form(modelForm))).rejects.toThrow("NEXT_REDIRECT:/pricing-models?notice=updated");
    expect(apiMock.updateModel).toHaveBeenCalledWith(7, expect.objectContaining({ baseRate: 0.27 }));
  });

  it("deletes and redirects with a notice", async () => {
    apiMock.deleteModel.mockResolvedValue(undefined);
    await expect(deleteModelAction(3)).rejects.toThrow("NEXT_REDIRECT:/pricing-models?notice=deleted");
    expect(apiMock.deleteModel).toHaveBeenCalledWith(3);
  });

  it("reports API failures on delete through the redirect", async () => {
    apiMock.deleteModel.mockRejectedValue(new ApiError(404, "Not found."));
    await expect(deleteModelAction(3)).rejects.toThrow(/NEXT_REDIRECT:\/pricing-models\?error=Not%20found/);
  });

  it("blocks non-admin deletes", async () => {
    authMock.mockResolvedValue(plainUser);
    await expect(deleteModelAction(3)).rejects.toThrow(/NEXT_REDIRECT:\/pricing-models\?error=/);
    expect(apiMock.deleteModel).not.toHaveBeenCalled();
  });
});

describe("pricing actions", () => {
  const input = { pricingModelName: "AutoLoan-Standard", nominalValue: "1000000000", maturityYears: "1", trancheType: "Junior" };

  it("prices simple", async () => {
    apiMock.priceSimple.mockResolvedValue({ purchasePrice: 751879699.25 });
    const state = await priceSimpleAction({}, form(input));
    expect(apiMock.priceSimple).toHaveBeenCalledWith({ pricingModelName: "AutoLoan-Standard", nominalValue: 1_000_000_000, maturityYears: 1 });
    expect(state.simple?.purchasePrice).toBe(751879699.25);
    expect(state.values?.nominalValue).toBe("1000000000");
  });

  it("prices the chosen tranche", async () => {
    apiMock.priceTranche.mockResolvedValue({ purchasePrice: 137931034.48 });
    const state = await priceTrancheAction({}, form(input));
    expect(apiMock.priceTranche).toHaveBeenCalledWith({
      pricingModelName: "AutoLoan-Standard",
      nominalValue: 1_000_000_000,
      maturityYears: 1,
      trancheType: "Junior",
    });
    expect(state.tranche?.purchasePrice).toBe(137931034.48);
  });

  it("validates before calling the API", async () => {
    const state = await priceSimpleAction({}, form({ ...input, nominalValue: "-1" }));
    expect(state.fieldErrors?.nominalValue).toBeDefined();
    expect(apiMock.priceSimple).not.toHaveBeenCalled();
  });

  it("shows API errors such as an unknown model or missing role", async () => {
    apiMock.priceSimple.mockRejectedValue(new ApiError(404, "Pricing model not found", "No pricing model named 'X' exists."));
    expect((await priceSimpleAction({}, form(input))).message).toMatch(/No pricing model/);
    apiMock.priceTranche.mockRejectedValue(new ApiError(403, "Access denied.", "Your account needs the pricing-user role."));
    expect((await priceTrancheAction({}, form(input))).message).toMatch(/pricing-user/);
  });
});
