"use client";

import { useActionState, useState, type FormEvent } from "react";
import type { FormState } from "@/lib/form-state";
import {
  PERCENT_FIELDS,
  computeModelPreview,
  readModelForm,
  type ModelFormValues,
  type PercentField,
} from "@/lib/validation";
import { SubmitButton } from "./SubmitButton";
import { Alert, Card, Field, LinkButton, cx, inputClass } from "./ui";

type ModelAction = (state: FormState, formData: FormData) => Promise<FormState>;

function percentValues(values: Record<string, string>): Record<PercentField, string> {
  return Object.fromEntries(PERCENT_FIELDS.map((f) => [f, values[f] ?? ""])) as Record<PercentField, string>;
}

function PercentInput({
  name,
  label,
  hint,
  defaultValue,
  error,
}: {
  name: PercentField;
  label: string;
  hint?: string;
  defaultValue: string;
  error?: string;
}) {
  return (
    <Field label={label} htmlFor={name} error={error} hint={hint}>
      <div className="relative">
        <input
          id={name}
          name={name}
          inputMode="decimal"
          autoComplete="off"
          defaultValue={defaultValue}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${name}-error` : undefined}
          className={cx(inputClass, "pr-8", error && "border-red-400")}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">%</span>
      </div>
    </Field>
  );
}

export function ModelForm({
  action,
  initialValues,
  submitLabel,
}: {
  action: ModelAction;
  initialValues: Record<string, string>;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const values = state.values ?? initialValues;
  const errors = state.fieldErrors ?? {};
  const [preview, setPreview] = useState(() => computeModelPreview(percentValues(values)));

  const onChange = (event: FormEvent<HTMLFormElement>) => {
    const form: ModelFormValues = readModelForm(new FormData(event.currentTarget));
    setPreview(computeModelPreview(form));
  };

  return (
    <form action={formAction} onChange={onChange} className="space-y-6" noValidate>
      {state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <Card title="هویت">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="نام" htmlFor="name" error={errors.name} hint="یکتا. سرویس‌های قیمت‌گذاری مدل را با این نام انتخاب می‌کنند.">
            <input
              id="name"
              name="name"
              autoComplete="off"
              defaultValue={values.name}
              aria-invalid={errors.name ? true : undefined}
              className={cx(inputClass, errors.name && "border-red-400")}
            />
          </Field>
          <Field label="توضیحات" htmlFor="description" error={errors.description}>
            <input id="description" name="description" defaultValue={values.description} className={inputClass} />
          </Field>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={values.isActive !== "false"}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
          />
          فعال (مدل‌های غیرفعال برای قیمت‌گذاری قابل استفاده نیستند)
        </label>
      </Card>

      <Card title="اجزای نرخ تنزیل (سالانه)">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PercentInput name="baseRate" label="نرخ پایه" defaultValue={values.baseRate ?? ""} error={errors.baseRate} hint="سقف تأییدشده برای این دسته دارایی" />
          <PercentInput name="creditSpread" label="حق‌بیمه ریسک اعتباری" defaultValue={values.creditSpread ?? ""} error={errors.creditSpread} />
          <PercentInput name="prepaymentAdjustment" label="تعدیل پیش‌پرداخت" defaultValue={values.prepaymentAdjustment ?? ""} error={errors.prepaymentAdjustment} />
          <PercentInput name="liquidityPremium" label="حق‌بیمه نقدشوندگی" defaultValue={values.liquidityPremium ?? ""} error={errors.liquidityPremium} />
        </div>
        <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
          نرخ تنزیل مؤثر (قیمت‌گذاری ساده):{" "}
          <strong>{preview.effective !== null ? `${preview.effective}%` : "—"}</strong>
        </p>
      </Card>

      <Card title="سقف قانونی و کارمزد خدمات">
        <div className="grid gap-4 sm:grid-cols-2">
          <PercentInput
            name="regulatoryRateCap"
            label="سقف نرخ قانونی"
            defaultValue={values.regulatoryRateCap ?? ""}
            error={errors.regulatoryRateCap}
            hint="فقط قیمت‌ها را علامت‌گذاری می‌کند؛ هرگز آن‌ها را تغییر نمی‌دهد"
          />
          <PercentInput
            name="servicingFeeRate"
            label="کارمزد خدمات (سالانه)"
            defaultValue={values.servicingFeeRate ?? ""}
            error={errors.servicingFeeRate}
            hint="از وصولی‌ها کسر می‌شود، نه از قیمت"
          />
        </div>
      </Card>

      <Card title="ساختار Tranche">
        <div className="grid gap-4 sm:grid-cols-3">
          <PercentInput name="seniorShare" label="سهم Senior از پرتفو" defaultValue={values.seniorShare ?? ""} error={errors.seniorShare} hint="بین ۰ و ۱۰۰ (بدون احتساب مرزها)" />
          <PercentInput name="seniorDiscountRate" label="نرخ تنزیل Senior" defaultValue={values.seniorDiscountRate ?? ""} error={errors.seniorDiscountRate} />
          <PercentInput name="juniorDiscountRate" label="نرخ تنزیل Junior" defaultValue={values.juniorDiscountRate ?? ""} error={errors.juniorDiscountRate} hint="حداقل برابر نرخ Senior" />
        </div>
        <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
          سهم Junior از پرتفو:<strong>{preview.junior !== null ? `${preview.junior}%` : "—"}</strong>
        </p>
      </Card>

      <div className="flex gap-3">
        <SubmitButton pendingLabel="در حال ذخیره…">{submitLabel}</SubmitButton>
        <LinkButton href="/pricing-models" variant="secondary">
          انصراف
        </LinkButton>
      </div>
    </form>
  );
}
