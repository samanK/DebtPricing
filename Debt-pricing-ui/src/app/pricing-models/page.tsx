import Link from "next/link";
import { deleteModelAction } from "@/actions/pricing-models";
import { DeleteModelButton } from "@/components/DeleteModelButton";
import { ErrorPanel } from "@/components/ErrorPanel";
import { Alert, Badge, Card, LinkButton, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { attempt } from "@/lib/attempt";
import { formatPercent, formatUtc } from "@/lib/format";
import { isAdmin } from "@/lib/roles";
import { requireSession } from "@/lib/session";

const NOTICES: Record<string, string> = {
  created: "مدل قیمت‌گذاری ایجاد شد.",
  updated: "مدل قیمت‌گذاری به‌روزرسانی شد.",
  deleted: "مدل قیمت‌گذاری حذف شد.",
};

export default async function PricingModelsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const session = await requireSession();
  const { notice, error } = await searchParams;
  const admin = isAdmin(session);
  const result = await attempt(api.listModels());

  return (
    <>
      <PageHeader
        title="مدل‌های قیمت‌گذاری"
        description="هر مدل مجموعه‌ای نام‌دار از فرض‌های پایه است. درخواست‌های قیمت‌گذاری مدل را با نام انتخاب می‌کنند."
        actions={admin ? <LinkButton href="/pricing-models/new">مدل جدید</LinkButton> : undefined}
      />

      <div className="mb-4 space-y-3">
        {notice && NOTICES[notice] ? <Alert tone="success">{NOTICES[notice]}</Alert> : null}
        {error ? <Alert tone="error">{error}</Alert> : null}
      </div>

      {result.error ? (
        <ErrorPanel error={result.error} />
      ) : result.data.length === 0 ? (
        <Card className="text-sm text-slate-600">
          هنوز مدل قیمت‌گذاری‌ای وجود ندارد.
          {admin ? (
            <>
              {" "}
              <Link href="/pricing-models/new" className="font-medium text-indigo-700 underline">
                اولین مدل را ایجاد کنید.
              </Link>
            </>
          ) : null}
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">نام</th>
                <th className="px-4 py-3">نرخ مؤثر</th>
                <th className="px-4 py-3">سقف</th>
                <th className="px-4 py-3">Senior</th>
                <th className="px-4 py-3">Junior</th>
                <th className="px-4 py-3">وضعیت</th>
                <th className="px-4 py-3">آخرین به‌روزرسانی</th>
                <th className="px-4 py-3 text-right">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.data.map((model) => (
                <tr key={model.id} className="align-middle">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/pricing-models/${model.id}`} className="text-indigo-700 hover:underline">
                      {model.name}
                    </Link>
                    {model.description ? <p className="text-xs font-normal text-slate-500">{model.description}</p> : null}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatPercent(model.effectiveDiscountRate)}</td>
                  <td className="px-4 py-3 tabular-nums">{formatPercent(model.regulatoryRateCap)}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatPercent(model.seniorShare)} @ {formatPercent(model.seniorDiscountRate)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatPercent(model.juniorShare)} @ {formatPercent(model.juniorDiscountRate)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={model.isActive ? "green" : "neutral"}>{model.isActive ? "فعال" : "غیرفعال"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatUtc(model.updatedAtUtc)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <LinkButton href={`/pricing-models/${model.id}`} variant="secondary">
                        مشاهده
                      </LinkButton>
                      {admin ? (
                        <>
                          <LinkButton href={`/pricing-models/${model.id}/edit`} variant="secondary">
                            ویرایش
                          </LinkButton>
                          <DeleteModelButton name={model.name} action={deleteModelAction.bind(null, model.id)} />
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
