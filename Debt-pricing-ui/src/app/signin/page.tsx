import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { Alert, Card, buttonClass } from "@/components/ui";

const MESSAGES: Record<string, string> = {
  SessionExpired: "نشست شما منقضی شده است. لطفاً دوباره وارد شوید.",
  RefreshTokenError: "نشست شما تمدید نشد. لطفاً دوباره وارد شوید.",
  AccessDenied: "دسترسی توسط Keycloak رد شد.",
  Configuration: "پیکربندی ورود نامعتبر است. مقادیر AUTH_SECRET و AUTH_KEYCLOAK_* را بررسی کنید.",
  OAuthCallbackError: "Keycloak هنگام ورود خطایی برگرداند. آدرس بازگشت (redirect URI) و کلید کلاینت را بررسی کنید.",
  OAuthSignInError: "شروع ورود با Keycloak ممکن نشد. آیا Keycloak در حال اجراست و AUTH_KEYCLOAK_ISSUER درست است؟",
};

/** Only same-site relative paths are allowed as post-login destinations. */
function safeRedirectPath(value: string | undefined): string {
  if (!value) return "/";
  try {
    const base = new URL(process.env.AUTH_URL ?? "http://localhost:3000");
    const url = new URL(value, base);
    return url.origin === base.origin ? `${url.pathname}${url.search}` : "/";
  } catch {
    return "/";
  }
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error, callbackUrl } = await searchParams;
  const destination = safeRedirectPath(callbackUrl);

  const session = await auth();
  if (session?.user && !session.error) redirect(destination);

  const message = error ? (MESSAGES[error] ?? "ورود ناموفق بود. لطفاً دوباره تلاش کنید.") : null;

  return (
    <div className="mx-auto mt-16 max-w-md">
      <Card className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">قیمت‌گذاری بدهی</h1>
          <p className="mt-1 text-sm text-slate-600">با حساب سازمانی خود (Keycloak) وارد شوید.</p>
        </div>
        {message ? <Alert tone="warning">{message}</Alert> : null}
        <form
          action={async () => {
            "use server";
            await signIn("keycloak", { redirectTo: destination });
          }}
        >
          <button type="submit" className={buttonClass("primary", "w-full")}>
            ورود با Keycloak
          </button>
        </form>
      </Card>
    </div>
  );
}
