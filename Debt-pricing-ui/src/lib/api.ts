import "server-only";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ApiError, apiErrorFromResponse } from "./api-error";
import { canUsePricing } from "./roles";
import type {
  PricingModel,
  PricingModelInput,
  SimplePricingRequest,
  SimplePricingResult,
  TranchePricingRequest,
  TranchePricingResult,
} from "./types";

export { ApiError } from "./api-error";

const API_URL = (process.env.DEBTPRICING_API_URL ?? "http://localhost:5080").replace(/\/+$/, "");

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Calls the DebtPricing API with the signed-in user's Keycloak access token. Server-side only. */
async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    redirect("/signin?error=SessionExpired");
  }

  // Without a pricing role Keycloak does not even add the API to the token audience, so the API would answer
  // with a confusing 401. Say what is actually wrong instead.
  if (!canUsePricing(session)) {
    throw new ApiError(
      403,
      "دسترسی مجاز نیست.",
      "حساب شما نه نقش pricing-user و نه pricing-admin را دارد. از مدیر Keycloak بخواهید یکی از این نقش‌ها را به شما بدهد.",
    );
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: init.method ?? "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.accessToken}`,
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "امکان اتصال به API قیمت‌گذاری نیست.", `پاسخی از ${API_URL} دریافت نشد. آیا API در حال اجراست؟`);
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const body = text ? parseJson(text) : null;
  if (!response.ok) throw apiErrorFromResponse(response.status, body);
  return body as T;
}

export const api = {
  listModels: (activeOnly = false) =>
    request<PricingModel[]>(`/api/pricing-models${activeOnly ? "?activeOnly=true" : ""}`),
  getModel: (id: number) => request<PricingModel>(`/api/pricing-models/${id}`),
  createModel: (input: PricingModelInput) =>
    request<PricingModel>("/api/pricing-models", { method: "POST", body: input }),
  updateModel: (id: number, input: PricingModelInput) =>
    request<PricingModel>(`/api/pricing-models/${id}`, { method: "PUT", body: input }),
  deleteModel: (id: number) => request<void>(`/api/pricing-models/${id}`, { method: "DELETE" }),
  priceSimple: (body: SimplePricingRequest) =>
    request<SimplePricingResult>("/api/pricing/simple", { method: "POST", body }),
  priceTranche: (body: TranchePricingRequest) =>
    request<TranchePricingResult>("/api/pricing/tranche", { method: "POST", body }),
};
