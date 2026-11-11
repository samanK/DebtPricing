"use client";

import Link from "next/link";
import { useActionState, useState, type ChangeEvent } from "react";
import type { FormState } from "@/lib/form-state";
import { formatPercent } from "@/lib/format";
import { formatThousands } from "@/lib/numbers";
import type { PricingModel } from "@/lib/types";
import { PricingResult } from "./PricingResult";
import { SubmitButton } from "./SubmitButton";
import { Alert, Card, Field, cx, inputClass } from "./ui";

type PricingAction = (state: FormState, formData: FormData) => Promise<FormState>;

export function PricingCalculator({
  mode,
  models,
  action,
  defaultModel,
  canCreateModels,
}: {
  mode: "simple" | "tranche";
  models: PricingModel[];
  action: PricingAction;
  defaultModel?: string;
  canCreateModels: boolean;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const values = state.values ?? {};
  const errors = state.fieldErrors ?? {};

  const initialModel = values.pricingModelName ?? defaultModel ?? models[0]?.name ?? "";
  const [modelName, setModelName] = useState(initialModel);
  const [nominal, setNominal] = useState(() => formatThousands(values.nominalValue ?? ""));
  const selected = models.find((m) => m.name === modelName);
  const result = mode === "simple" ? state.simple : state.tranche;

  if (models.length === 0) {
    return (
      <Alert tone="warning" title="مدل قیمت‌گذاری فعالی وجود ندارد">
        {canCreateModels ? (
          <>
            ابتدا یکی را در{" "}
            <Link href="/pricing-models/new" className="font-medium underline">
              صفحه مدل جدید
            </Link>{" "}
            ایجاد کنید.
          </>
        ) : (
          "از مدیر بخواهید یک مدل قیمت‌گذاری ایجاد کند."
        )}
      </Alert>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={formAction} className="space-y-4" noValidate>
        <Card title={mode === "simple" ? "قیمت‌گذاری ساده" : "قیمت‌گذاری Tranche"} className="space-y-4">
          {state.message ? <Alert tone="error">{state.message}</Alert> : null}

          <Field label="مدل قیمت‌گذاری" htmlFor="pricingModelName" error={errors.pricingModelName}>
            <select
              id="pricingModelName"
              name="pricingModelName"
              value={modelName}
              onChange={(event) => setModelName(event.target.value)}
              className={inputClass}
            >
              {models.map((model) => (
                <option key={model.id} value={model.name}>
                  {model.name}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="ارزش اسمی (تومان)"
            htmlFor="nominalValue"
            error={errors.nominalValue}
            hint={mode === "tranche" ? "ارزش اسمی کل پرتفو؛ سهم Tranche به‌صورت خودکار اعمال می‌شود." : "ارزش اسمی مطالبات."}
          >
            <input
              id="nominalValue"
              name="nominalValue"
              inputMode="decimal"
              autoComplete="off"
              placeholder="1,000,000,000"
              value={nominal}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setNominal(formatThousands(event.target.value))}
              aria-invalid={errors.nominalValue ? true : undefined}
              className={cx(inputClass, errors.nominalValue && "border-red-400")}
            />
          </Field>

          <Field label="سررسید (سال)" htmlFor="maturityYears" error={errors.maturityYears} hint="کسری هم مجاز است، مثلاً ۰٫۵.">
            <input
              id="maturityYears"
              name="maturityYears"
              inputMode="decimal"
              autoComplete="off"
              placeholder="1"
              defaultValue={values.maturityYears ?? ""}
              aria-invalid={errors.maturityYears ? true : undefined}
              className={cx(inputClass, errors.maturityYears && "border-red-400")}
            />
          </Field>

          {mode === "tranche" ? (
            <fieldset>
              <legend className="mb-1 block text-sm font-medium text-slate-700">Tranche</legend>
              <div className="flex gap-3">
                {(["Senior", "Junior"] as const).map((type) => (
                  <label
                    key={type}
                    className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50"
                  >
                    <input type="radio" name="trancheType" value={type} defaultChecked={(values.trancheType ?? "Senior") === type} />
                    {type}
                  </label>
                ))}
              </div>
              {errors.trancheType ? <p className="mt-1 text-xs text-red-600">{errors.trancheType}</p> : null}
            </fieldset>
          ) : null}

          <SubmitButton pendingLabel="در حال محاسبه…">محاسبه قیمت</SubmitButton>
        </Card>

        {selected ? (
          <Card title="مدل انتخاب‌شده" className="text-sm text-slate-700">
            <p>
              {mode === "simple" ? (
                <>
                  نرخ تنزیل مؤثر <strong>{formatPercent(selected.effectiveDiscountRate)}</strong> (پایه{" "}
                  {formatPercent(selected.baseRate)} + ریسک اعتباری {formatPercent(selected.creditSpread)} + پیش‌پرداخت{" "}
                  {formatPercent(selected.prepaymentAdjustment)} + نقدشوندگی {formatPercent(selected.liquidityPremium)})
                </>
              ) : (
                <>
                  Senior <strong>{formatPercent(selected.seniorShare)}</strong> از پرتفو با نرخ{" "}
                  <strong>{formatPercent(selected.seniorDiscountRate)}</strong>؛ Junior{" "}
                  <strong>{formatPercent(selected.juniorShare)}</strong> با نرخ{" "}
                  <strong>{formatPercent(selected.juniorDiscountRate)}</strong>
                </>
              )}
              . سقف قانونی {formatPercent(selected.regulatoryRateCap)}.
            </p>
          </Card>
        ) : null}
      </form>

      <div>
        {result ? (
          <PricingResult result={result} />
        ) : (
          <Card className="text-sm text-slate-500">مقادیر را وارد کنید و «محاسبه قیمت» را بزنید تا قیمت خرید را ببینید.</Card>
        )}
      </div>
    </div>
  );
}
