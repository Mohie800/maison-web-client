"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { useRouter, Link } from "@/i18n/navigation";
import { Field, AuthSubmit, OrDivider } from "@/components/form/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { mapValidationErrors } from "@/lib/api/field-errors";
import { authApi } from "../api";
import { signUpSchema, type SignUpValues } from "../schemas";

/** Create account — Figma node 651:16454. */
const FIELDS = ["fullName", "email", "phoneNumber", "password"] as const;

export function SignUpForm({
  socialProviders = [],
}: {
  socialProviders?: string[];
}) {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  async function onSubmit(values: SignUpValues) {
    setFormError(null);
    try {
      const registration = await authApi.register({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        acceptedTerms: true,
        ...(values.phoneNumber ? { phoneNumber: values.phoneNumber } : {}),
      });

      // Registration issues no tokens — the OTP step is what authenticates.
      const params = new URLSearchParams({
        userId: registration.userId,
        destination: registration.destination,
        channel: registration.channel,
        // Carries the real expiry and cooldown to the countdown (GAP-29).
        ...(registration.expiresAt ? { expiresAt: registration.expiresAt } : {}),
        ...(registration.resendAvailableAt
          ? { resendAt: registration.resendAvailableAt }
          : {}),
      });
      router.push(`/verify-otp?${params.toString()}`);
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
          {t("signUpTitle")}
        </h1>
        <p className="text-ink-500 text-[14px]">{t("signUpSubtitle")}</p>
      </div>

      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <Field
        label={t("fullName")}
        autoComplete="name"
        placeholder={t("fullNamePlaceholder")}
        error={errors.fullName?.message}
        {...register("fullName")}
      />

      <Field
        label={t("email")}
        type="email"
        autoComplete="email"
        placeholder="your@email.com"
        dir="ltr"
        error={errors.email?.message}
        {...register("email")}
      />

      <Field
        label={t("password")}
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        error={errors.password?.message}
        {...register("password")}
      />

      <Field
        label={t("phone")}
        type="tel"
        autoComplete="tel"
        placeholder="+966 5X XXX XXXX"
        dir="ltr"
        error={errors.phoneNumber?.message}
        {...register("phoneNumber")}
      />

      {/*
        Custom control rather than shadcn's Checkbox: the design's is a filled
        dark-green square with a white tick, and it needs to sit inline with the
        label text. Still a real checkbox semantically — the input is present and
        focusable, just visually replaced.
      */}
      <div className="flex flex-col gap-1.5">
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={accepted}
            onChange={(event) => {
              setAccepted(event.target.checked);
              setValue(
                "acceptedTerms",
                (event.target.checked ? true : undefined) as true,
                { shouldValidate: true },
              );
            }}
          />
          <span
            aria-hidden
            className={`flex size-5 shrink-0 items-center justify-center rounded-[5px] border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-focus ${
              accepted
                ? "border-transparent bg-[#064e3b] text-white"
                : "border-line-200 bg-fill-50"
            }`}
          >
            {accepted && <Check className="size-3.5" strokeWidth={3} />}
          </span>
          <span className="text-ink-500 text-[13px]">{t("acceptTerms")}</span>
        </label>
        {errors.acceptedTerms && (
          <p className="text-error text-[12px]">{t("termsRequired")}</p>
        )}
      </div>

      <AuthSubmit type="submit" disabled={isSubmitting}>
        {t("signUp")}
      </AuthSubmit>

      <OrDivider label={t("or")} />

      {/* Drawn from `providers` — empty while no client ids are set. */}
      {socialProviders.length > 0 ? null : (
        <p className="text-ink-400 text-center text-[12px]">
          {t("socialComingSoon")}
        </p>
      )}

      <p className="text-ink-500 text-center text-[13px]">
        {t("haveAccount")}{" "}
        <Link href="/sign-in" className="text-action font-semibold">
          {t("signIn")}
        </Link>
      </p>
    </form>
  );
}
