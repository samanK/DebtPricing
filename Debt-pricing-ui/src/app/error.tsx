"use client";

import { Alert, buttonClass } from "@/components/ui";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="space-y-4">
      <Alert tone="error" title="مشکلی پیش آمد">
        <p>{error.digest ? `کد پیگیری: ${error.digest}` : "یک خطای غیرمنتظره رخ داد."}</p>
      </Alert>
      <button type="button" onClick={reset} className={buttonClass("secondary")}>
        تلاش دوباره
      </button>
    </div>
  );
}
