import { formatMoney, formatPercent, formatYears } from "@/lib/format";
import type { SimplePricingResult, TranchePricingResult } from "@/lib/types";
import { Alert, Badge, Card, DefinitionGrid } from "./ui";

type Result = SimplePricingResult | TranchePricingResult;

function isTranche(result: Result): result is TranchePricingResult {
  return "trancheType" in result;
}

export function PricingResult({ result }: { result: Result }) {
  const tranche = isTranche(result);
  const nominal = tranche ? result.trancheNominalValue : result.nominalValue;

  const items = [
    { label: "مدل قیمت‌گذاری", value: result.pricingModelName },
    ...(tranche
      ? [
          { label: "Tranche", value: <Badge tone={result.trancheType === "Senior" ? "indigo" : "amber"}>{result.trancheType}</Badge> },
          { label: "ارزش اسمی پرتفو", value: `${formatMoney(result.poolNominalValue)} تومان` },
          { label: "سهم Tranche از پرتفو", value: formatPercent(result.trancheShare) },
        ]
      : []),
    { label: tranche ? "ارزش اسمی Tranche" : "ارزش اسمی", value: `${formatMoney(nominal)} تومان` },
    { label: "سررسید", value: formatYears(result.maturityYears) },
    { label: "نرخ تنزیل (سالانه)", value: formatPercent(result.discountRate) },
    { label: "سود خریدار در سررسید", value: `${formatMoney(result.buyerProfitAtMaturity)} تومان` },
    { label: "سقف قانونی", value: formatPercent(result.regulatoryRateCap) },
    {
      label: "نسبت به سقف",
      value: result.exceedsRegulatoryCap ? <Badge tone="amber">بالاتر از سقف</Badge> : <Badge tone="green">در محدوده سقف</Badge>,
    },
  ];

  return (
    <Card title="نتیجه" className="space-y-5">
      <div aria-live="polite">
        <p className="text-sm text-slate-500">قیمت خرید امروز</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">
          {formatMoney(result.purchasePrice)} <span className="text-lg font-normal text-slate-500">تومان</span>
        </p>
      </div>

      {result.warnings.length > 0 ? (
        <Alert tone="warning" title="یادداشت قانونی">
          <ul className="list-disc space-y-1 ps-5">
            {result.warnings.map((warning) => (
              <li key={warning} dir="auto">
                {warning}
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <DefinitionGrid items={items} />
    </Card>
  );
}
