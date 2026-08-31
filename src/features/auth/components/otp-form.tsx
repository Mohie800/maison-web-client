"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useRouter, Link } from "@/i18n/navigation";
import { AuthSubmit } from "@/components/form/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { ApiError } from "@/lib/api/errors";
import { authApi } from "../api";

/** Whole seconds from now until `iso`, floored at 0. Null when unknown. */
function secondsUntil(iso: string | null, now: number): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso) - now;
  return Number.isNaN(ms) ? null : Math.max(0, Math.ceil(ms / 1000));
}

/**
 * OTP verification — Figma node 651:16515 ("Check your email").
 *
 * Six large slots, an expiry countdown paired with "Resend code", and a spam
 * folder hint. The code is submitted automatically once six digits are entered;
 * the button is there for the keyboard/paste path and as an explicit action.
 *
 * Both countdowns run off timestamps the API returns (GAP-29): `expiresAt` for
 * the code, `resendAvailableAt` for the 60s resend cooldown, which the API
 * enforces with a 400. Neither is assumed — when they're absent (a deep link
 * into this screen), the countdown is simply not shown.
 */
export function OtpForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const searchParams = useSearchParams();

  const userId = searchParams.get("userId") ?? "";
  const destination = searchParams.get("destination") ?? "";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [expiresAt, setExpiresAt] = useState(searchParams.get("expiresAt"));
  const [resendAt, setResendAt] = useState(searchParams.get("resendAt"));

  /**
   * The clock both countdowns read. Re-read from `Date.now()` each tick rather
   * than decremented, so a backgrounded tab doesn't drift away from the real
   * deadline. setState lives in the interval callback, not the effect body —
   * a synchronous setState in an effect is rejected by the lint rules.
   */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const secondsLeft = secondsUntil(expiresAt, now);
  const resendIn = secondsUntil(resendAt, now) ?? 0;
  const expired = secondsLeft === 0;
  const clock = (total: number) =>
    `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;

  async function verify(value: string) {
    setSubmitting(true);
    setError(null);
    try {
      const result = await authApi.verifyOtp({ userId, code: value });
      /* Web_EmailVerified (`651:16561`) sits between the two — it used to be
         skipped entirely. A finished profile still gets the confirmation. */
      router.replace(
        result.profileCompleted ? "/email-verified" : "/onboarding/profile",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("otpFailed"));
      setCode("");
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    setError(null);
    setResending(true);
    try {
      const sent = await authApi.resendOtp({ userId });
      setNotice(t("otpResent"));
      setExpiresAt(sent.expiresAt ?? null);
      setResendAt(sent.resendAvailableAt ?? null);
      setCode("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("otpResendFailed"));
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/sign-up"
        className="text-action flex w-fit items-center gap-1 text-[13px] font-medium"
      >
        {/* Direction-aware: points right in Arabic. */}
        <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t("otpBack")}
      </Link>

      <div className="flex flex-col gap-2">
        <h1 className="text-ink-900 text-[28px] leading-tight font-bold">
          {t("otpTitle")}
        </h1>
        <p className="text-ink-500 text-[14px]">
          {t("otpSentTo")}
          <br />
          <span className="text-ink-900 font-semibold" dir="ltr">
            {destination}
          </span>
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      {/* The code is always Western digits and left-to-right, in both locales. */}
      <div dir="ltr">
        <InputOTP
          maxLength={6}
          value={code}
          disabled={expired}
          onChange={(value) => {
            setCode(value);
            if (value.length === 6) void verify(value);
          }}
        >
          <InputOTPGroup className="gap-2.5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <InputOTPSlot
                key={i}
                index={i}
                className="bg-fill-50 border-line-200 data-[active=true]:border-aqua data-[active=true]:ring-aqua/40 size-14 rounded-12 border text-[22px] font-bold first:rounded-12 last:rounded-12 data-[active=true]:ring-2"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>

      <div className="flex items-center justify-between gap-4">
        <span
          className={`text-[13px] ${expired ? "text-error" : "text-ink-400"}`}
        >
          {expired && t("otpExpired")}
          {secondsLeft !== null &&
            !expired &&
            t("otpExpiresIn", { time: clock(secondsLeft) })}
        </span>
        <button
          type="button"
          onClick={resend}
          disabled={resending || resendIn > 0}
          className="text-action text-[13px] font-semibold disabled:opacity-50"
        >
          {resendIn > 0
            ? t("otpResendIn", { time: clock(resendIn) })
            : t("otpResend")}
        </button>
      </div>

      <AuthSubmit
        onClick={() => verify(code)}
        disabled={submitting || code.length !== 6 || expired}
      >
        {t("otpVerify")}
      </AuthSubmit>

      <p className="text-ink-500 text-center text-[13px]">
        {t("otpNoEmail")}{" "}
        <span className="text-action font-semibold">{t("otpCheckSpam")}</span>
      </p>
    </div>
  );
}
