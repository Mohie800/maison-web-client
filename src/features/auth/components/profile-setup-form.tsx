"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Field, AuthSubmit } from "@/components/form/field";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { browserApiFetch } from "@/lib/api/browser";
import { ApiError } from "@/lib/api/errors";
import { mapValidationErrors } from "@/lib/api/field-errors";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { profileSetupSchema, type ProfileSetupValues } from "../schemas";

const FIELDS = ["username", "dob", "city", "country"] as const;

export function ProfileSetupForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfileSetupValues>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: { username: "", notifyPriceDrops: true },
  });

  // useWatch rather than watch(): watch() returns a fresh function each render,
  // which makes React Compiler skip memoising the whole component.
  const username = useWatch({ control, name: "username" });

  /**
   * Debounced availability check. Without the delay this fires a request per
   * keystroke; 400ms batches typing while still answering before the user
   * reaches the submit button.
   *
   * Modelled as a query rather than an effect writing state: availability is
   * server state derived from the username, so it caches per name and avoids
   * re-asking when the user edits back to something already checked.
   */
  const debouncedUsername = useDebouncedValue(username, 400);

  const { data: availability } = useQuery({
    queryKey: ["users", "username-available", debouncedUsername],
    queryFn: () =>
      browserApiFetch<{ username: string; available: boolean }>(
        "/users/username-available",
        { params: { username: debouncedUsername } },
      ),
    // The API's own rule is 3-60 characters; below that there is nothing to ask.
    enabled: debouncedUsername.length >= 3,
    staleTime: 30_000,
    // A failed check shouldn't block the form — the API validates on submit.
    retry: false,
  });

  const isTaken = availability?.available === false;

  async function onSubmit(values: ProfileSetupValues) {
    setFormError(null);
    try {
      /**
       * PUT /users/me/profile is multipart/form-data — it accepts a profilePic
       * binary alongside the text fields, so the whole payload goes as FormData
       * even when no image is attached.
       */
      const body = new FormData();
      body.set("username", values.username);
      body.set("notifyPriceDrops", String(values.notifyPriceDrops));
      if (values.dob) body.set("dob", values.dob);
      if (values.gender) body.set("gender", values.gender);
      if (values.city) body.set("city", values.city);
      if (values.country) body.set("country", values.country);

      await browserApiFetch("/users/me/profile", { method: "PUT", body });

      router.push("/onboarding/interests");
    } catch (error) {
      const { fieldErrors, formErrors } = mapValidationErrors(error, FIELDS);
      for (const [field, message] of Object.entries(fieldErrors)) {
        setError(field as (typeof FIELDS)[number], { message });
      }
      if (formErrors.length) {
        setFormError(formErrors[0]);
      } else if (error instanceof ApiError) {
        setFormError(error.message);
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-ink-900 text-[28px] leading-tight font-bold">{t("profileTitle")}</h1>
        <p className="text-ink-500 text-[14px]">{t("profileSubtitle")}</p>
      </div>

      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-1">
        <Field
          label={t("username")}
          // Usernames are lowercase latin + digits, so always LTR.
          dir="ltr"
          autoComplete="username"
          hint={t("usernameHint")}
          error={errors.username?.message}
          {...register("username")}
        />
        {availability && !errors.username && (
          <p
            className={`text-caption ${
              availability.available ? "text-success" : "text-error"
            }`}
          >
            {availability.available
              ? t("usernameAvailable")
              : t("usernameTaken")}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label={t("city")}
          error={errors.city?.message}
          {...register("city")}
        />
        <Field
          label={t("country")}
          placeholder="SA"
          dir="ltr"
          error={errors.country?.message}
          {...register("country")}
        />
      </div>

      <AuthSubmit
        type="submit"
        disabled={isSubmitting || isTaken}
       
      >
        {t("continue")}
      </AuthSubmit>
    </form>
  );
}
