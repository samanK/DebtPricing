"use server";

import { api } from "@/lib/api";
import { ApiError } from "@/lib/api-error";
import type { FormState } from "@/lib/form-state";
import {
  readPricingForm,
  validateSimplePricing,
  validateTranchePricing,
  type PricingFormValues,
} from "@/lib/validation";

function toRecord(values: PricingFormValues): Record<string, string> {
  return { ...values };
}

function apiFailure(error: unknown, values: PricingFormValues): FormState {
  if (!(error instanceof ApiError)) throw error; // includes Next.js redirect signals
  return { message: error.userMessage, fieldErrors: error.fieldErrors, values: toRecord(values) };
}

export async function priceSimpleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = readPricingForm(formData);
  const { errors, request } = validateSimplePricing(values);
  if (!request) return { fieldErrors: errors, values: toRecord(values) };

  try {
    const simple = await api.priceSimple(request);
    return { simple, values: toRecord(values) };
  } catch (error) {
    return apiFailure(error, values);
  }
}

export async function priceTrancheAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = readPricingForm(formData);
  const { errors, request } = validateTranchePricing(values);
  if (!request) return { fieldErrors: errors, values: toRecord(values) };

  try {
    const tranche = await api.priceTranche(request);
    return { tranche, values: toRecord(values) };
  } catch (error) {
    return apiFailure(error, values);
  }
}
