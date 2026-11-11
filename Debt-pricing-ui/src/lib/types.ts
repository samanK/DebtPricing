// Shapes of the DebtPricing API (ASP.NET Core, camelCase JSON). All rates are fractions: 0.27 = 27%.

export type TrancheType = "Senior" | "Junior";

export interface PricingModelInput {
  name: string;
  description: string | null;
  baseRate: number;
  creditSpread: number;
  prepaymentAdjustment: number;
  liquidityPremium: number;
  regulatoryRateCap: number;
  servicingFeeRate: number;
  seniorShare: number;
  seniorDiscountRate: number;
  juniorDiscountRate: number;
  isActive: boolean;
}

export interface PricingModel extends PricingModelInput {
  id: number;
  effectiveDiscountRate: number;
  juniorShare: number;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface SimplePricingRequest {
  pricingModelName: string;
  nominalValue: number;
  maturityYears: number;
}

export interface TranchePricingRequest extends SimplePricingRequest {
  trancheType: TrancheType;
}

export interface SimplePricingResult {
  pricingModelName: string;
  nominalValue: number;
  maturityYears: number;
  discountRate: number;
  purchasePrice: number;
  buyerProfitAtMaturity: number;
  regulatoryRateCap: number;
  exceedsRegulatoryCap: boolean;
  warnings: string[];
}

export interface TranchePricingResult {
  pricingModelName: string;
  trancheType: TrancheType;
  poolNominalValue: number;
  trancheShare: number;
  trancheNominalValue: number;
  maturityYears: number;
  discountRate: number;
  purchasePrice: number;
  buyerProfitAtMaturity: number;
  regulatoryRateCap: number;
  exceedsRegulatoryCap: boolean;
  warnings: string[];
}
