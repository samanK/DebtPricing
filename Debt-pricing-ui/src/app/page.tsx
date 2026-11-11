import Link from "next/link";
import { Badge, Card, PageHeader } from "@/components/ui";
import { ADMIN_ROLE, USER_ROLE, canUsePricing, isAdmin } from "@/lib/roles";
import { requireSession } from "@/lib/session";

export default async function HomePage() {
  const session = await requireSession();
  const name = session.user?.name ?? session.user?.email ?? "کاربر";
  const sections = [
    { href: "/pricing-models", title: "مدل‌های قیمت‌گذاری", text: "مجموعه‌های نام‌دار فرض‌های پایه: نرخ‌ها، سقف قانونی و ساختار Tranche." },
    { href: "/pricing/simple", title: "قیمت‌گذاری ساده", text: "قیمت‌گذاری یک پرتفوی مطالبات با نرخ تنزیل مؤثر یک مدل." },
    { href: "/pricing/tranche", title: "قیمت‌گذاری Tranche", text: "قیمت‌گذاری Tranche ارشد یا فرعی یک پرتفوی مطالبات." },
  ];

  return (
    <>
      <PageHeader title={`خوش آمدید، ${name}`} description="قیمت‌گذاری خرید و فروش بدهی برای مطالبات وام خودرو." />

      {!canUsePricing(session) ? (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          حساب شما نه نقش <Badge tone="neutral">{USER_ROLE}</Badge> و نه نقش <Badge tone="indigo">{ADMIN_ROLE}</Badge>{" "}
          را دارد، بنابراین API درخواست‌های شما را رد می‌کند. از مدیر Keycloak بخواهید یکی از این نقش‌ها را به شما بدهد.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {sections.map((section) => (
          <Link key={section.href} href={section.href} className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300">
            <Card className="h-full transition hover:border-indigo-300 hover:shadow">
              <h2 className="text-base font-semibold text-slate-900">{section.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{section.text}</p>
            </Card>
          </Link>
        ))}
      </div>

      <p className="mt-6 text-sm text-slate-500">
        {isAdmin(session) ? "شما می‌توانید مدل‌های قیمت‌گذاری را ایجاد، ویرایش و حذف کنید." : "شما فقط دسترسی خواندن به مدل‌های قیمت‌گذاری دارید."}
      </p>
    </>
  );
}
