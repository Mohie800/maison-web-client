"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter, Link } from "@/i18n/navigation";
import { Field, AuthSubmit, OrDivider } from "@/components/form/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { mapValidationErrors } from "@/lib/api/field-errors";
import { authApi } from "../api";
import { signInSchema, type SignInValues } from "../schemas";

/**
 * Sign in — Figma node 651:16404.
 *
 * The design has a separate `Web_Phone_SignIn` screen (651:16667) rather than an
 * in-page toggle. Both live here, switched by `?method=phone`, so each variant is
 * its own URL — which is how the design's two screens are reached.
 */
const FIELDS = ["email", "phoneNumber", "password"] as const;

export function SignInForm({
  socialProviders = [],
}: {
  /** From `GET /auth/social/config` — which buttons the environment can serve. */
  socialProviders?: string[];
}) {
  const t = useTranslations("Auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);

  const usePhone = searchParams.get("method") === "phone";

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { method: usePhone ? "phone" : "email", password: "" },
  });

  const method = useWatch({ control, name: "method" });

  async function onSubmit(values: SignInValues) {
    setFormError(null);
    try {
      const result = await authApi.signIn({
        password: values.password,
        ...(values.method === "email"
          ? { email: values.email }
          : { phoneNumber: values.phoneNumber }),
      });

      const next = searchParams.get("next");
      router.replace(
        result.profileCompleted ? (next ?? "/") : "/onboarding/profile",
      );
      router.refresh();
    } catch (error) {
      const { fieldErrors, formErrors } = mapValidationErrors(error, FIELDS);
      for (const [field, message] of Object.entries(fieldErrors)) {
        setError(field as (typeof FIELDS)[number], { message });
      }
      if (formErrors.length) setFormError(formErrors[0]);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-ink-900 text-[28px] leading-tight font-bold">
          {t("signInTitle")}
        </h1>
        <p className="text-ink-500 text-[14px]">{t("signInSubtitle")}</p>
      </div>

      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {/* Keeps the schema's discriminator in sync with the URL variant. */}
      <input type="hidden" {...register("method")} />

      {method === "phone" ? (
        <Field
          label={t("phone")}
          type="tel"
          autoComplete="tel"
          placeholder="+9665…"
          // Phone numbers read left-to-right even in an RTL layout.
          dir="ltr"
          error={errors.phoneNumber?.message}
          {...register("phoneNumber")}
        />
      ) : (
        <Field
          label={t("email")}
          type="email"
          autoComplete="email"
          placeholder="your@email.com"
          dir="ltr"
          error={errors.email?.message}
          {...register("email")}
        />
      )}

      <Field
        label={t("password")}
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        error={errors.password?.message}
        {...register("password")}
      />

      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="text-action text-[12px] font-medium"
        >
          {t("forgotPassword")}
        </Link>
      </div>

      <AuthSubmit type="submit" disabled={isSubmitting}>
        {t("signIn")}
      </AuthSubmit>

      <OrDivider label={t("or")} />

      {/*
        The design shows "Continue with Google" and "Continue with Apple". The
        row is drawn from `providers`, which is what says *which* buttons the
        environment can serve — empty today, so the phone alternative takes the
        space rather than two buttons that can't do anything. See config.ts.
      */}
      {socialProviders.length > 0 ? null : (
        <Link
          href={usePhone ? "/sign-in" : "/sign-in?method=phone"}
          className="border-line-200 text-ink-700 flex h-[46px] items-center justify-center rounded-10 border text-[13px] font-medium"
        >
          {usePhone ? t("useEmail") : t("usePhone")}
        </Link>
      )}

      <p className="text-ink-500 text-center text-[13px]">
        {t("noAccount")}{" "}
        <Link href="/sign-up" className="text-action font-semibold">
          {t("signUp")}
        </Link>
      </p>
    </form>
  );
}
