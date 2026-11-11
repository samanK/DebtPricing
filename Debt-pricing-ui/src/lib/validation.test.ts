import { describe, expect, it } from "vitest";
import {
  computeModelPreview,
  modelValuesToRecord,
  readModelForm,
  readPricingForm,
  validateModelForm,
  validateSimplePricing,
  validateTranchePricing,
  type ModelFormValues,
} from "./validation";

const valid: ModelFormValues = {
  name: "AutoLoan-Standard",
  description: "Example",
  isActive: true,
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

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

describe("validateModelForm", () => {
  it("converts percentages to API fractions", () => {
    const { errors, input } = validateModelForm(valid);
    expect(errors).toEqual({});
    expect(input).toEqual({
      name: "AutoLoan-Standard",
      description: "Example",
      baseRate: 0.27,
      creditSpread: 0.03,
      prepaymentAdjustment: 0.01,
      liquidityPremium: 0.02,
      regulatoryRateCap: 0.3,
      servicingFeeRate: 0.012,
      seniorShare: 0.8,
      seniorDiscountRate: 0.28,
      juniorDiscountRate: 0.45,
      isActive: true,
    });
  });

  it("trims the name and turns an empty description into null", () => {
    const { input } = validateModelForm({ ...valid, name: "  M1  ", description: "   " });
    expect(input?.name).toBe("M1");
    expect(input?.description).toBeNull();
  });

  it("flags required, non-numeric, out-of-range and over-precise values", () => {
    const { errors, input } = validateModelForm({
      ...valid,
      name: "",
      baseRate: "",
      creditSpread: "abc",
      prepaymentAdjustment: "101",
      liquidityPremium: "1.23456",
    });
    expect(input).toBeUndefined();
    expect(Object.keys(errors).sort()).toEqual(["baseRate", "creditSpread", "liquidityPremium", "name", "prepaymentAdjustment"]);
  });

  it("requires 0 < senior share < 100", () => {
    expect(validateModelForm({ ...valid, seniorShare: "0" }).errors.seniorShare).toBeDefined();
    expect(validateModelForm({ ...valid, seniorShare: "100" }).errors.seniorShare).toBeDefined();
    expect(validateModelForm({ ...valid, seniorShare: "99.9999" }).errors.seniorShare).toBeUndefined();
  });

  it("requires senior rate <= junior rate", () => {
    const { errors } = validateModelForm({ ...valid, seniorDiscountRate: "50", juniorDiscountRate: "40" });
    expect(errors.juniorDiscountRate).toBeDefined();
    expect(validateModelForm({ ...valid, seniorDiscountRate: "40", juniorDiscountRate: "40" }).errors).toEqual({});
  });

  it("accepts Persian digits", () => {
    expect(validateModelForm({ ...valid, baseRate: "۲۷٫۵" }).input?.baseRate).toBe(0.275);
  });
});

describe("readModelForm", () => {
  it("reads the checkbox and percent fields", () => {
    expect(readModelForm(form({ ...valid, isActive: "on" } as unknown as Record<string, string>)).isActive).toBe(true);
    const unchecked = { ...valid } as unknown as Record<string, string>;
    delete unchecked.isActive;
    expect(readModelForm(form(unchecked)).isActive).toBe(false);
  });
  it("round-trips through a string record", () => {
    expect(modelValuesToRecord({ ...valid, isActive: false }).isActive).toBe("false");
  });
});

describe("computeModelPreview", () => {
  it("sums components without float noise and derives the junior share", () => {
    expect(computeModelPreview(valid)).toEqual({ effective: "33", junior: "20" });
    expect(computeModelPreview({ ...valid, baseRate: "0.1", creditSpread: "0.2", prepaymentAdjustment: "0", liquidityPremium: "0" }).effective).toBe("0.3");
  });
  it("returns null while inputs are incomplete or invalid", () => {
    expect(computeModelPreview({ ...valid, baseRate: "" })).toEqual({ effective: null, junior: "20" });
    expect(computeModelPreview({ ...valid, seniorShare: "100" }).junior).toBeNull();
  });
});

describe("pricing form validation", () => {
  const base = { pricingModelName: "M1", nominalValue: "1,000,000,000", maturityYears: "1", trancheType: "Senior" };

  it("accepts a valid simple request", () => {
    const { errors, request } = validateSimplePricing(readPricingForm(form(base)));
    expect(errors).toEqual({});
    expect(request).toEqual({ pricingModelName: "M1", nominalValue: 1_000_000_000, maturityYears: 1 });
  });

  it("rejects bad values", () => {
    const bad = validateSimplePricing(readPricingForm(form({ ...base, pricingModelName: "", nominalValue: "0", maturityYears: "51" })));
    expect(Object.keys(bad.errors).sort()).toEqual(["maturityYears", "nominalValue", "pricingModelName"]);
    expect(validateSimplePricing(readPricingForm(form({ ...base, maturityYears: "0" }))).errors.maturityYears).toBeDefined();
    expect(validateSimplePricing(readPricingForm(form({ ...base, nominalValue: "-5" }))).errors.nominalValue).toBeDefined();
    expect(validateSimplePricing(readPricingForm(form({ ...base, maturityYears: "0.5" }))).request?.maturityYears).toBe(0.5);
  });

  it("requires a tranche type for tranche pricing", () => {
    expect(validateTranchePricing(readPricingForm(form({ ...base, trancheType: "Junior" }))).request?.trancheType).toBe("Junior");
    expect(validateTranchePricing(readPricingForm(form({ ...base, trancheType: "Mezz" }))).errors.trancheType).toBeDefined();
    expect(validateTranchePricing(readPricingForm(form({ ...base, trancheType: "" }))).request).toBeUndefined();
  });
});
