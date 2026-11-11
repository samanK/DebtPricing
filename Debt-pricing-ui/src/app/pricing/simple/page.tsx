import { priceSimpleAction } from "@/actions/pricing";
import { ErrorPanel } from "@/components/ErrorPanel";
import { PricingCalculator } from "@/components/PricingCalculator";
import { PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { attempt } from "@/lib/attempt";
import { isAdmin } from "@/lib/roles";
import { requireSession } from "@/lib/session";

export default async function SimplePricingPage({
  searchParams,
}: {
  searchParams: Promise<{ model?: string }>;
}) {
  const session = await requireSession();
  const { model } = await searchParams;
  const result = await attempt(api.listModels(true));

  return (
    <>
      <PageHeader title="قیمت‌گذاری ساده" description="قیمت = ارزش اسمی / (1 + نرخ تنزیل مؤثر) ^ سال." />
      {result.error ? (
        <ErrorPanel error={result.error} />
      ) : (
        <PricingCalculator
          mode="simple"
          models={result.data}
          action={priceSimpleAction}
          defaultModel={result.data.some((m) => m.name === model) ? model : undefined}
          canCreateModels={isAdmin(session)}
        />
      )}
    </>
  );
}
