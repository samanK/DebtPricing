import Link from "next/link";
import { auth, signOut } from "@/auth";
import { ADMIN_ROLE, USER_ROLE } from "@/lib/roles";
import { NavLinks } from "./NavLinks";
import { Badge, buttonClass } from "./ui";

export async function Nav() {
  const session = await auth();
  if (!session?.user) return null;

  const name = session.user.name ?? session.user.email ?? "وارد شده";
  const appRoles = (session.roles ?? []).filter((r) => r === ADMIN_ROLE || r === USER_ROLE);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-base font-semibold text-slate-900">
            قیمت‌گذاری بدهی
          </Link>
          <NavLinks />
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-sm">
            <p className="font-medium text-slate-900">{name}</p>
            <p className="mt-0.5 flex justify-end gap-1">
              {appRoles.length > 0 ? (
                appRoles.map((role) => (
                  <Badge key={role} tone={role === ADMIN_ROLE ? "indigo" : "neutral"}>
                    {role}
                  </Badge>
                ))
              ) : (
                <Badge tone="amber">بدون نقش قیمت‌گذاری</Badge>
              )}
            </p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/signin" });
            }}
          >
            <button type="submit" className={buttonClass("secondary")}>
              خروج
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
