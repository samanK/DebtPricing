"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass, type ButtonVariant } from "./ui";

export function SubmitButton({
  children,
  pendingLabel = "در حال انجام…",
  variant = "primary",
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: ButtonVariant;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass(variant)}>
      {pending ? pendingLabel : children}
    </button>
  );
}
