"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Labelled input matching the auth design (Figma node 651:16424).
 *
 * Exact spec: 6px label→input gap, label Inter Medium 13px `t/ink-700`,
 * input 48px tall on `t/fill-50` with a `t/border-200` hairline, 10px radius,
 * 14px horizontal padding, 14px text, placeholder `t/ink-400`.
 *
 * Not built on shadcn's `Input`: that carries its own height, radius and focus
 * ring, so overriding all three left the class list fighting itself. A plain
 * input is shorter and matches the design exactly.
 *
 * `error` is a translation key from features/auth/schemas.ts, or a ready-made
 * sentence when it came back from the API. Keys never contain spaces, which is
 * how the two are told apart.
 */
export interface FieldProps extends React.ComponentProps<"input"> {
  label: string;
  error?: string;
  hint?: string;
  /** Rendered on the trailing side of the label row. */
  labelAction?: React.ReactNode;
}

export function Field({
  label,
  error,
  hint,
  labelAction,
  className,
  id,
  ...props
}: FieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const t = useTranslations("Validation");

  const message = error ? (error.includes(" ") ? error : t(error)) : undefined;

  const describedBy = message
    ? `${fieldId}-error`
    : hint
      ? `${fieldId}-hint`
      : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={fieldId} className="text-ink-700 text-[13px] font-medium">
          {label}
        </label>
        {labelAction}
      </div>

      <input
        id={fieldId}
        aria-invalid={message ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "bg-fill-50 text-ink placeholder:text-ink-400 h-12 rounded-10 border px-3.5 text-[14px] outline-none transition-colors",
          message ? "border-error" : "border-line-200 focus:border-focus",
          className,
        )}
        {...props}
      />

      {message ? (
        <p id={`${fieldId}-error`} className="text-error text-[12px]">
          {message}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="text-ink-400 text-[12px]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Primary auth button — Figma node 651:16434.
 * 50px tall, full width, `accent/aqua`, fully rounded, Inter Bold 15px black.
 *
 * Black rather than `text-on-accent`: that's what the design specifies, and it
 * measures 15.8:1 against the mint versus 6.7:1 for the dark green.
 */
export function AuthSubmit({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={cn(
        "bg-aqua flex h-[50px] w-full items-center justify-center rounded-full text-[15px] font-bold text-black transition-opacity disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** "OR" rule between the form and alternate sign-in methods. */
export function OrDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="bg-line-200 h-px flex-1" aria-hidden />
      <span className="text-ink-400 text-[11px] font-medium">{label}</span>
      <span className="bg-line-200 h-px flex-1" aria-hidden />
    </div>
  );
}
