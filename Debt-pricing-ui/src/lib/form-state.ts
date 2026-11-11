import type { SimplePricingResult, TranchePricingResult } from "./types";

export type FieldErrors = Record<string, string>;

/** State returned by server actions used with React's useActionState. */
export interface FormState {
  /** Form-level message (validation summary or API error). */
  message?: string;
  fieldErrors?: FieldErrors;
  /** Submitted raw values, so the form can be re-populated after an error. */
  values?: Record<string, string>;
  simple?: SimplePricingResult;
  tranche?: TranchePricingResult;
}
