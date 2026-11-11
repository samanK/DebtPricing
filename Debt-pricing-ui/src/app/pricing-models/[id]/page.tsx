import { notFound } from "next/navigation";
import { deleteModelAction } from "@/actions/pricing-models";
import { DeleteModelButton } from "@/components/DeleteModelButton";
import { ErrorPanel } from "@/components/ErrorPanel";
import { Badge, Card, DefinitionGrid, LinkButton, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { attempt } from "@/lib/attempt";
import { formatPercent, formatUtc } from "@/lib/format";
import { isAdmin } from "@/lib/roles";
import { requireSession } from "@/lib/session";

export default async function ModelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const modelId = Number(id);
  if (!Number.isInteger(modelId) || modelId <= 0) notFound();

  const result = await attempt(api.getModel(modelId));
  if (result.error?.status === 404) notFound();
  if (result.error) return <ErrorPanel error={result.error} />;

  const model = result.data;
  const admin = isAdmin(session);
  const query = `?model=${encodeURIComponent(model.name)}`;

  return (
    <>
      <PageHeader
        title={model.name}
        description={model.description ?? undefined}
        actions={
          <>
            {model.isActive ? (
              <>
                <LinkButton href={`/pricing/simple${query}`} variant="secondary">
                  قیمت‌گذاری ساده
                </LinkButton>
                <LinkButton href={`/pricing/tranche${query}`} variant="secondary">
                  قیمت‌گذاری Tranche
                </LinkButton>
              </>
            ) : null}
            {admin ? (
              <>
                <LinkButton href={`/pricing-models/${model.id}/edit`}>ویرایش</LinkButton>
                <DeleteModelButton name={model.name} action={deleteModelAction.bind(null, model.id)} />
              </>
            ) : null}
          </>
        }
      />

      <div className="space-y-6">
        <Card title="اجزای نرخ تنزیل (سالانه)">
          <DefinitionGrid
            items={[
              { label: "نرخ پایه", value: formatPercent(model.baseRate) },
              { label: "حق‌بیمه ریسک اعتباری", value: formatPercent(model.creditSpread) },
              { label: "تعدیل پیش‌پرداخت", value: formatPercent(model.prepaymentAdjustment) },
              { label: "حق‌بیمه نقدشوندگی", value: formatPercent(model.liquidityPremium) },
              { label: "نرخ تنزیل مؤثر", value: <strong>{formatPercent(model.effectiveDiscountRate)}</strong> },
            ]}
          />
        </Card>

        <Card title="ساختار Tranche">
          <DefinitionGrid
            items={[
              { label: "سهم Senior", value: formatPercent(model.seniorShare) },
              { label: "نرخ تنزیل Senior", value: formatPercent(model.seniorDiscountRate) },
              { label: "سهم Junior", value: formatPercent(model.juniorShare) },
              { label: "نرخ تنزیل Junior", value: formatPercent(model.juniorDiscountRate) },
            ]}
          />
        </Card>

        <Card title="سایر موارد">
          <DefinitionGrid
            items={[
              { label: "سقف نرخ قانونی", value: formatPercent(model.regulatoryRateCap) },
              { label: "کارمزد خدمات (سالانه)", value: formatPercent(model.servicingFeeRate) },
              {
                label: "وضعیت",
                value: <Badge tone={model.isActive ? "green" : "neutral"}>{model.isActive ? "فعال" : "غیرفعال"}</Badge>,
              },
              { label: "ایجادشده", value: formatUtc(model.createdAtUtc) },
              { label: "به‌روزرسانی", value: formatUtc(model.updatedAtUtc) },
            ]}
          />
        </Card>
      </div>
    </>
  );
}
