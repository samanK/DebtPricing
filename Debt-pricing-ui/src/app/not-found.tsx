import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">صفحه پیدا نشد</h1>
      <p className="text-sm text-slate-600">صفحه یا مدل قیمت‌گذاری درخواستی وجود ندارد.</p>
      <LinkButton href="/pricing-models" variant="secondary">
        بازگشت به مدل‌های قیمت‌گذاری
      </LinkButton>
    </div>
  );
}
