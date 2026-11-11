import { notFound } from "next/navigation";
import { updateModelAction } from "@/actions/pricing-models";
import { AccessDenied, ErrorPanel } from "@/components/ErrorPanel";
import { ModelForm } from "@/components/ModelForm";
import { PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { attempt } from "@/lib/attempt";
import { modelToFormValues } from "@/lib/model-form";
import { isAdmin } from "@/lib/roles";
import { requireSession } from "@/lib/session";

export default async function EditModelPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!isAdmin(session)) return <AccessDenied message="برای ویرایش مدل‌های قیمت‌گذاری به نقش pricing-admin نیاز دارید." />;

  const { id } = await params;
  const modelId = Number(id);
  if (!Number.isInteger(modelId) || modelId <= 0) notFound();

  const result = await attempt(api.getModel(modelId));
  if (result.error?.status === 404) notFound();
  if (result.error) return <ErrorPanel error={result.error} />;

  return (
    <>
      <PageHeader
        title={`ویرایش ${result.data.name}`}
        description="تغییر نام مدل، فراخوانی‌کنندگانی را که از نام قبلی استفاده می‌کنند از کار می‌اندازد."
      />
      <ModelForm
        action={updateModelAction.bind(null, modelId)}
        initialValues={modelToFormValues(result.data)}
        submitLabel="ذخیره تغییرات"
      />
    </>
  );
}
