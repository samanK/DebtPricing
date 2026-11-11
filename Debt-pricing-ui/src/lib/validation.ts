import type { FieldErrors } from "./form-state";
import { decimalPlaces, normalizeNumberInput, parseDecimal, percentToFraction } from "./numbers";
import type { PricingModelInput, SimplePricingRequest, TranchePricingRequest, TrancheType } from "./types";

// ---------------------------------------------------------------- pricing models

export const PERCENT_FIELDS = [
  "baseRate",
  "creditSpread",
  "prepaymentAdjustment",
  "liquidityPremium",
  "regulatoryRateCap",
  "servicingFeeRate",
  "seniorShare",
  "seniorDiscountRate",
  "juniorDiscountRate",
] as const;

export type PercentField = (typeof PERCENT_FIELDS)[number];

export type ModelFormValues = {
  name: string;
  description: string;
  isActive: boolean;
} & Record<PercentField, string>;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function readModelForm(formData: FormData): ModelFormValues {
  const percents = Object.fromEntries(PERCENT_FIELDS.map((f) => [f, text(formData, f)])) as Record<PercentField, string>;
  const active = text(formData, "isActive");
  return {
    name: text(formData, "name"),
    description: text(formData, "description"),
    isActive: active === "on" || active === "true",
    ...percents,
  };
}

/** Flattens form values to strings so they can travel back to the browser in the action state. */
export function modelValuesToRecord(values: ModelFormValues): Record<string, string> {
  return { ...values, isActive: values.isActive ? "true" : "false" };
}

function checkPercent(raw: string, opts: { exclusiveBounds?: boolean } = {}): { error?: string; percent?: number } {
  const s = normalizeNumberInput(raw);
  if (s === "") return { error: "الزامی است." };
  const percent = parseDecimal(raw);
  if (percent === null) return { error: "یک عدد مانند ۲۷ یا ۲۷٫۵ وارد کنید." };
  if (decimalPlaces(raw) > 4) return { error: "حداکثر ۴ رقم اعشار مجاز است." };
  if (opts.exclusiveBounds) {
    if (percent <= 0 || percent >= 100) return { error: "باید بزرگ‌تر از ۰ و کوچک‌تر از ۱۰۰ باشد." };
  } else if (percent > 100) {
    return { error: "باید بین ۰ و ۱۰۰ باشد." };
  }
  return { percent };
}

export function validateModelForm(values: ModelFormValues): { errors: FieldErrors; input?: PricingModelInput } {
  const errors: FieldErrors = {};

  const name = values.name.trim();
  if (name === "") errors.name = "الزامی است.";
  else if (name.length > 100) errors.name = "حداکثر ۱۰۰ نویسه مجاز است.";

  const description = values.description.trim();
  if (description.length > 500) errors.description = "حداکثر ۵۰۰ نویسه مجاز است.";

  const percents: Partial<Record<PercentField, number>> = {};
  for (const field of PERCENT_FIELDS) {
    const result = checkPercent(values[field], { exclusiveBounds: field === "seniorShare" });
    if (result.error) errors[field] = result.error;
    else percents[field] = result.percent;
  }

  if (
    percents.seniorDiscountRate !== undefined &&
    percents.juniorDiscountRate !== undefined &&
    percents.seniorDiscountRate > percents.juniorDiscountRate
  ) {
    errors.juniorDiscountRate = "باید حداقل برابر نرخ Senior باشد (Tranche فرعی اولین زیان‌ها را می‌پذیرد).";
  }

  if (Object.keys(errors).length > 0) return { errors };

  const fraction = (f: PercentField) => percentToFraction(values[f]) as number;
  return {
    errors,
    input: {
      name,
      description: description === "" ? null : description,
      baseRate: fraction("baseRate"),
      creditSpread: fraction("creditSpread"),
      prepaymentAdjustment: fraction("prepaymentAdjustment"),
      liquidityPremium: fraction("liquidityPremium"),
      regulatoryRateCap: fraction("regulatoryRateCap"),
      servicingFeeRate: fraction("servicingFeeRate"),
      seniorShare: fraction("seniorShare"),
      seniorDiscountRate: fraction("seniorDiscountRate"),
      juniorDiscountRate: fraction("juniorDiscountRate"),
      isActive: values.isActive,
    },
  };
}

/** Live preview shown in the model form: effective discount rate and junior share, in percent. */
export function computeModelPreview(values: Record<PercentField, string>): { effective: string | null; junior: string | null } {
  const trim = (n: number) => String(Number(n.toFixed(4)));
  const parts = [values.baseRate, values.creditSpread, values.prepaymentAdjustment, values.liquidityPremium].map(parseDecimal);
  const effective = parts.every((p): p is number => p !== null) ? trim(parts.reduce((a, b) => a + b, 0)) : null;
  const senior = parseDecimal(values.seniorShare);
  const junior = senior !== null && senior > 0 && senior < 100 ? trim(100 - senior) : null;
  return { effective, junior };
}

// ---------------------------------------------------------------- pricing requests

export interface PricingFormValues {
  pricingModelName: string;
  nominalValue: string;
  maturityYears: string;
  trancheType: string;
}

export function readPricingForm(formData: FormData): PricingFormValues {
  return {
    pricingModelName: text(formData, "pricingModelName"),
    nominalValue: text(formData, "nominalValue"),
    maturityYears: text(formData, "maturityYears"),
    trancheType: text(formData, "trancheType"),
  };
}

export const MAX_MATURITY_YEARS = 50;

function validatePricingCommon(values: PricingFormValues): { errors: FieldErrors; request?: SimplePricingRequest } {
  const errors: FieldErrors = {};

  const pricingModelName = values.pricingModelName.trim();
  if (pricingModelName === "") errors.pricingModelName = "یک مدل قیمت‌گذاری انتخاب کنید.";

  const nominalValue = parseDecimal(values.nominalValue);
  if (normalizeNumberInput(values.nominalValue) === "") errors.nominalValue = "الزامی است.";
  else if (nominalValue === null) errors.nominalValue = "یک عدد ساده وارد کنید، مثلاً ۱۰۰۰۰۰۰۰۰۰۰.";
  else if (nominalValue <= 0) errors.nominalValue = "باید بزرگ‌تر از ۰ باشد.";
  else if (nominalValue >= 1e15) errors.nominalValue = "خیلی بزرگ است.";

  const maturityYears = parseDecimal(values.maturityYears);
  if (normalizeNumberInput(values.maturityYears) === "") errors.maturityYears = "الزامی است.";
  else if (maturityYears === null) errors.maturityYears = "تعداد سال را وارد کنید، مثلاً ۱ یا ۰٫۵.";
  else if (maturityYears <= 0 || maturityYears > MAX_MATURITY_YEARS) {
    errors.maturityYears = `باید بزرگ‌تر از ۰ و حداکثر ${MAX_MATURITY_YEARS} باشد.`;
  }

  if (Object.keys(errors).length > 0 || nominalValue === null || maturityYears === null) return { errors };
  return { errors, request: { pricingModelName, nominalValue, maturityYears } };
}

export function validateSimplePricing(values: PricingFormValues): { errors: FieldErrors; request?: SimplePricingRequest } {
  return validatePricingCommon(values);
}

export function validateTranchePricing(values: PricingFormValues): { errors: FieldErrors; request?: TranchePricingRequest } {
  const common = validatePricingCommon(values);
  const errors = { ...common.errors };

  const trancheType: TrancheType | null =
    values.trancheType === "Senior" || values.trancheType === "Junior" ? values.trancheType : null;
  if (trancheType === null) errors.trancheType = "Senior یا Junior را انتخاب کنید.";

  if (Object.keys(errors).length > 0 || !common.request || trancheType === null) return { errors };
  return { errors, request: { ...common.request, trancheType } };
}
