import { priceTrancheAction } from "@/actions/pricing";
import { ErrorPanel } from "@/components/ErrorPanel";
import { PricingCalculator } from "@/components/PricingCalculator";
import { PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { attempt } from "@/lib/attempt";
import { isAdmin } from "@/lib/roles";
import { requireSession } from "@/lib/session";

export default async function TranchePricingPage({
  searchParams,
}: {
  searchParams: Promise<{ model?: string }>;
}) {
  const session = await requireSession();
  const { model } = await searchParams;
  const result = await attempt(api.listModels(true));

  return (
    <>
      <PageHeader title="قیمت‌گذاری Tranche" description="قیمت Tranche ارشد یا فرعی پرتفو را با سهم و نرخ مدل محاسبه می‌کند." />
      {result.error ? (
        <ErrorPanel error={result.error} />
      ) : (
        <PricingCalculator
          mode="tranche"
          models={result.data}
          action={priceTrancheAction}
          defaultModel={result.data.some((m) => m.name === model) ? model : undefined}
          canCreateModels={isAdmin(session)}
        />
      )}
    </>
  );
}
