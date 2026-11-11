import { ApiError } from "@/lib/api-error";
import { Alert } from "./ui";

/** Shows an API failure on a page instead of crashing it. */
export function ErrorPanel({ error }: { error: ApiError }) {
  return (
    <Alert tone="error" title={error.title}>
      {error.detail ? <p>{error.detail}</p> : null}
    </Alert>
  );
}

export function AccessDenied({ message }: { message: string }) {
  return (
    <Alert tone="warning" title="دسترسی مجاز نیست">
      <p>{message}</p>
    </Alert>
  );
}
