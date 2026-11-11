"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/api-error";
import type { FormState } from "@/lib/form-state";
import { isAdmin } from "@/lib/roles";
import { modelValuesToRecord, readModelForm, validateModelForm, type ModelFormValues } from "@/lib/validation";

const NOT_ADMIN = "برای تغییر مدل‌های قیمت‌گذاری به نقش pricing-admin نیاز دارید.";

/** Returns a form state when the caller may not change models; redirects when not signed in. */
async function adminGuard(): Promise<FormState | null> {
  const session = await auth();
  if (!session?.user || session.error) redirect("/signin");
  return isAdmin(session) ? null : { message: NOT_ADMIN };
}

function apiFailure(error: unknown, values: ModelFormValues): FormState {
  if (!(error instanceof ApiError)) throw error; // includes Next.js redirect signals
  const fieldErrors = { ...error.fieldErrors };
  if (error.status === 409) fieldErrors.name = error.userMessage; // duplicate name
  return { message: error.userMessage, fieldErrors, values: modelValuesToRecord(values) };
}

export async function createModelAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await adminGuard();
  if (denied) return denied;

  const values = readModelForm(formData);
  const { errors, input } = validateModelForm(values);
  if (!input) {
    return { message: "لطفاً فیلدهای مشخص‌شده را اصلاح کنید.", fieldErrors: errors, values: modelValuesToRecord(values) };
  }

  try {
    await api.createModel(input);
  } catch (error) {
    return apiFailure(error, values);
  }

  revalidatePath("/pricing-models");
  redirect("/pricing-models?notice=created");
}

export async function updateModelAction(id: number, _prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await adminGuard();
  if (denied) return denied;

  const values = readModelForm(formData);
  const { errors, input } = validateModelForm(values);
  if (!input) {
    return { message: "لطفاً فیلدهای مشخص‌شده را اصلاح کنید.", fieldErrors: errors, values: modelValuesToRecord(values) };
  }

  try {
    await api.updateModel(id, input);
  } catch (error) {
    return apiFailure(error, values);
  }

  revalidatePath("/pricing-models");
  revalidatePath(`/pricing-models/${id}`);
  redirect("/pricing-models?notice=updated");
}

export async function deleteModelAction(id: number): Promise<void> {
  const denied = await adminGuard();
  if (denied) redirect(`/pricing-models?error=${encodeURIComponent(NOT_ADMIN)}`);

  try {
    await api.deleteModel(id);
  } catch (error) {
    if (error instanceof ApiError) redirect(`/pricing-models?error=${encodeURIComponent(error.userMessage)}`);
    throw error;
  }

  revalidatePath("/pricing-models");
  redirect("/pricing-models?notice=deleted");
}
