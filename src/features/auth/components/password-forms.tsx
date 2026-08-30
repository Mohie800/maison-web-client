"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Check } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Field, AuthSubmit } from "@/components/form/field";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { ApiError } from "@/lib/api/errors";
import { authApi } from "../api";
import { forgotPasswordSchema, resetPasswordSchema } from "../schemas";
import type { z } from "zod";

type ForgotValues = z.infer<typeof forgotPasswordSchema>;
type ResetValues = z.infer<typeof resetPasswordSchema>;

export function ForgotPasswordForm() {
  const t = useTranslations("Auth");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotValues) {
    setError(null);
    try {
      await authApi.forgotPassword(values);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Request failed.");
    }
  }

  /**
   * Success is reported without confirming whether the address exists — the
   * message is deliberately non-committal so this can't be used to enumerate
   * registered accounts.
   */
  if (sent) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-ink-900 text-[28px] leading-tight font-bold">
          {t("forgotTitle")}
        </h1>
        <Alert>
          <AlertDescription>{t("forgotSent")}</AlertDescription>
        </Alert>
        <Link
          href="/sign-in"
          className="text-action text-center text-[13px] font-semibold"
        >
          {t("signIn")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* Back — 651:16609 */}
      <Link
        href="/sign-in"
        className="text-action inline-flex items-center gap-1.5 text-[13px] font-medium"
      >
        <ChevronLeft className="size-3.5 rtl:rotate-180" aria-hidden />
        {t("backToSignIn")}
      </Link>

      <div className="flex flex-col gap-2">
        <h1 className="text-ink-900 text-[28px] leading-tight font-bold">
          {t("forgotTitle")}
        </h1>
        <p className="text-ink-500 text-[14px]">{t("forgotSubtitle")}</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Field
        label={t("email")}
        type="email"
        autoComplete="email"
        placeholder={t("resetEmailPlaceholder")}
        dir="ltr"
        error={errors.email?.message}
        {...register("email")}
      />

      {/*
        Hint — 651:16619. The frame says "a 6-digit code"; this flow sends a
        tokenised link, which is what its own button and subtitle say, so the
        line describes what actually arrives.
      */}
      <p className="text-ink-400 -mt-3 text-[12px]">{t("forgotHint")}</p>

      <AuthSubmit type="submit" disabled={isSubmitting}>
        {t("forgotSubmit")}
      </AuthSubmit>
    </form>
  );
}

export function ResetPasswordForm() {
  const t = useTranslations("Auth");
  const searchParams = useSearchParams();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: searchParams.get("token") ?? "" },
  });

  /*
    Rules — 651:16650. Only the length rule is enforced: the API's password
    constraint is 8-72 characters and nothing else. The other two are the
    guidance the frame draws, which it also lets you submit past.
  */
  const newPassword = useWatch({ control, name: "password" }) ?? "";
  const rules = [
    { key: "ruleLength", met: newPassword.length >= 8 },
    { key: "ruleUppercase", met: /[A-Z]/.test(newPassword) },
    { key: "ruleNumber", met: /[^A-Za-z]/.test(newPassword) },
  ];

  async function onSubmit(values: ResetValues) {
    setError(null);
    try {
      await authApi.resetPassword({
        token: values.token,
        password: values.password,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Request failed.");
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-ink-900 text-[28px] leading-tight font-bold">
          {t("resetTitle")}
        </h1>
        <Alert>
          <AlertDescription>{t("resetDone")}</AlertDescription>
        </Alert>
        <Link
          href="/sign-in"
          className="text-action text-center text-[13px] font-semibold"
        >
          {t("signIn")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-ink-900 text-[28px] leading-tight font-bold">
          {t("resetTitle")}
        </h1>
        <p className="text-ink-500 text-[14px]">{t("resetSubtitle")}</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <input type="hidden" {...register("token")} />

      <Field
        label={t("password")}
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <Field
        label={t("confirmPassword")}
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      {/* Rules — 651:16650 */}
      <ul className="-mt-2 flex flex-col gap-1.5">
        {rules.map((rule) => (
          <li key={rule.key} className="flex items-center gap-2">
            <span
              className={`flex size-4 items-center justify-center rounded-8 ${
                rule.met ? "bg-action-tint text-action" : "bg-fill-100"
              }`}
              aria-hidden
            >
              {rule.met && <Check className="size-3" />}
            </span>
            <span
              className={`text-[12px] ${rule.met ? "text-action" : "text-ink-400"}`}
            >
              {t(rule.key as "ruleLength")}
            </span>
          </li>
        ))}
      </ul>

      <AuthSubmit type="submit" disabled={isSubmitting}>
        {t("resetSubmit")}
      </AuthSubmit>
    </form>
  );
}
