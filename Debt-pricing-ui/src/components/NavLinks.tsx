"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

const links = [
  { href: "/pricing-models", label: "مدل‌های قیمت‌گذاری" },
  { href: "/pricing/simple", label: "قیمت‌گذاری ساده" },
  { href: "/pricing/tranche", label: "قیمت‌گذاری Tranche" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1" aria-label="منوی اصلی">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "rounded-md px-3 py-2 text-sm font-medium",
              active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
