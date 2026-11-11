import { fractionToPercent } from "./numbers";
import type { PricingModel } from "./types";

export const EMPTY_MODEL_VALUES: Record<string, string> = {
  name: "",
  description: "",
  baseRate: "",
  creditSpread: "",
  prepaymentAdjustment: "",
  liquidityPremium: "",
  regulatoryRateCap: "",
  servicingFeeRate: "",
  seniorShare: "",
  seniorDiscountRate: "",
  juniorDiscountRate: "",
  isActive: "true",
};

/** Initial form values (rates as percentages) for editing an existing model. */
export function modelToFormValues(model: PricingModel): Record<string, string> {
  const pct = fractionToPercent;
  return {
    name: model.name,
    description: model.description ?? "",
    baseRate: pct(model.baseRate),
    creditSpread: pct(model.creditSpread),
    prepaymentAdjustment: pct(model.prepaymentAdjustment),
    liquidityPremium: pct(model.liquidityPremium),
    regulatoryRateCap: pct(model.regulatoryRateCap),
    servicingFeeRate: pct(model.servicingFeeRate),
    seniorShare: pct(model.seniorShare),
    seniorDiscountRate: pct(model.seniorDiscountRate),
    juniorDiscountRate: pct(model.juniorDiscountRate),
    isActive: model.isActive ? "true" : "false",
  };
}
