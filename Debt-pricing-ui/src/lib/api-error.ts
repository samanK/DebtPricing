import type { FieldErrors } from "./form-state";

/** Error returned by (or while reaching) the DebtPricing API. Safe to show to the user. */
export class ApiError extends Error {
  readonly status: number;
  readonly title: string;
  readonly detail?: string;
  readonly fieldErrors: FieldErrors;

  constructor(status: number, title: string, detail?: string, fieldErrors: FieldErrors = {}) {
    super(detail ?? title);
    this.name = "ApiError";
    this.status = status;
    this.title = title;
    this.detail = detail;
    this.fieldErrors = fieldErrors;
  }

  /** Text for an alert: the detail when there is one, otherwise the title. */
  get userMessage(): string {
    return this.detail ?? this.title;
  }
}

function defaultTitle(status: number): string {
  switch (status) {
    case 400:
      return "API درخواست را رد کرد.";
    case 401:
      return "API توکن دسترسی را نپذیرفت.";
    case 403:
      return "دسترسی مجاز نیست.";
    case 404:
      return "یافت نشد.";
    case 409:
      return "تداخل داده.";
    case 422:
      return "درخواست قابل پردازش نیست.";
    default:
      return `API خطایی برگرداند (${status}).`;
  }
}

function defaultDetail(status: number): string | undefined {
  if (status === 401) {
    return "بررسی کنید که audience توکن شامل کلاینت API باشد (کاربر باید یک نقش کلاینت API را داشته باشد) و issuer با Keycloak:Authority در API یکی باشد.";
  }
  if (status === 403) {
    return "حساب شما به نقش pricing-user (برای مشاهده و قیمت‌گذاری) یا pricing-admin (برای تغییر مدل‌های قیمت‌گذاری) نیاز دارد.";
  }
  return undefined;
}

/** ASP.NET validation keys look like "BaseRate" or "$.baseRate"; the forms use camelCase names. */
function toFieldName(key: string): string {
  const bare = key.replace(/^\$\./, "");
  return bare.charAt(0).toLowerCase() + bare.slice(1);
}

/** Builds an ApiError from an ASP.NET Core ProblemDetails / ValidationProblemDetails body. */
export function apiErrorFromResponse(status: number, body: unknown): ApiError {
  const problem = (body && typeof body === "object" ? body : {}) as {
    title?: unknown;
    detail?: unknown;
    errors?: unknown;
  };

  const fieldErrors: FieldErrors = {};
  if (problem.errors && typeof problem.errors === "object") {
    for (const [key, value] of Object.entries(problem.errors as Record<string, unknown>)) {
      fieldErrors[toFieldName(key)] = Array.isArray(value) ? value.join(" ") : String(value);
    }
  }

  const title = typeof problem.title === "string" && problem.title !== "" ? problem.title : defaultTitle(status);
  const detail =
    typeof problem.detail === "string" && problem.detail !== ""
      ? problem.detail
      : Object.values(fieldErrors)[0] ?? defaultDetail(status);

  return new ApiError(status, title, detail, fieldErrors);
}
