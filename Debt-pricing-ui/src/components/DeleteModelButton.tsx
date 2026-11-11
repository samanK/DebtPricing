"use client";

import { SubmitButton } from "./SubmitButton";

export function DeleteModelButton({
  name,
  action,
}: {
  name: string;
  action: () => Promise<void>;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`مدل قیمت‌گذاری "${name}" حذف شود؟ این کار قابل بازگشت نیست.`)) event.preventDefault();
      }}
    >
      <SubmitButton variant="danger" pendingLabel="در حال حذف…">
        حذف
      </SubmitButton>
    </form>
  );
}
