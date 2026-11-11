import { createModelAction } from "@/actions/pricing-models";
import { AccessDenied } from "@/components/ErrorPanel";
import { ModelForm } from "@/components/ModelForm";
import { PageHeader } from "@/components/ui";
import { EMPTY_MODEL_VALUES } from "@/lib/model-form";
import { isAdmin } from "@/lib/roles";
import { requireSession } from "@/lib/session";

export default async function NewModelPage() {
  const session = await requireSession();
  if (!isAdmin(session)) return <AccessDenied message="برای ایجاد مدل قیمت‌گذاری به نقش pricing-admin نیاز دارید." />;

  return (
    <>
      <PageHeader title="مدل قیمت‌گذاری جدید" description="نرخ‌ها را به‌صورت درصد وارد کنید، مثلاً ۲۷ برای ۲۷٪." />
      <ModelForm action={createModelAction} initialValues={EMPTY_MODEL_VALUES} submitLabel="ایجاد مدل" />
    </>
  );
}
