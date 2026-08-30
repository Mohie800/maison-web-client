"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { AuthSubmit } from "@/components/form/field";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { browserApiFetch } from "@/lib/api/browser";
import { ApiError } from "@/lib/api/errors";
import { mapValidationErrors } from "@/lib/api/field-errors";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { profileSetupSchema, type ProfileSetupValues } from "../schemas";
import { OnboardingShell } from "./onboarding-shell";

const FIELDS = ["fullName", "username", "city"] as const;

/**
 * Step 1 — Figma `651:16704`.
 *
 * The frame's three fields are Full name, Username and City. `country` is on
 * the API and was collected here before; the frame does not draw it and no
 * other screen does either, so it is no longer asked for — checkout collects
 * the country that actually matters, on the address.
 *
 * The avatar circle uploads since GAP-77 was answered: the multipart field is
 * `profilePic`. The whole circle is the control, with the frame's + badge on
 * its corner, and it previews nothing before submit — the server's stored path
 * is what the next screen reads.
 */
export function ProfileSetupForm({
  defaultName = "",
}: {
  defaultName?: string;
}) {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  /* react-hook-form doesn't own the file input; the submit reads it from here. */
  const [photo, setPhoto] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfileSetupValues>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: {
      fullName: defaultName,
      username: "",
      notifyPriceDrops: true,
    },
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
      if (values.fullName) body.set("fullName", values.fullName);
      if (values.dob) body.set("dob", values.dob);
      if (values.gender) body.set("gender", values.gender);
      if (values.city) body.set("city", values.city);
      if (photo) body.set("profilePic", photo);

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

  const label = "text-ink-900 text-[13px] font-semibold";
  const field =
    "bg-base border-line text-ink-900 focus:border-focus h-12 w-full rounded-12 border px-3.5 text-[14px] outline-none";

  return (
    <OnboardingShell
      step={1}
      wordmark={t("wordmark")}
      stepLabel={t("stepOne")}
      width="narrow"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        {/* Ellipse + badge — 651:16711 */}
        <div className="flex flex-col items-center gap-2">
          <label className="relative cursor-pointer">
            <span className="bg-tint block size-22 rounded-full" aria-hidden />
            <span
              className="bg-aqua text-on-accent absolute end-0 bottom-0 flex size-[30px] items-center justify-center rounded-full"
              aria-hidden
            >
              <Plus className="size-4" />
            </span>
            <input
              type="file"
              name="profilePic"
              accept="image/*"
              className="sr-only"
              onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
            />
            <span className="sr-only">{t("addPhoto")}</span>
          </label>
          <p className="text-ink-tertiary text-[12px] font-medium">
            {photo ? photo.name : t("addPhoto")}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="fullName" className={label}>
            {t("fullName")}
          </label>
          <input
            id="fullName"
            dir="auto"
            autoComplete="name"
            className={field}
            {...register("fullName")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="username" className={label}>
            {t("username")}
          </label>
          <input
            id="username"
            // Usernames are lowercase latin + digits, so always LTR.
            dir="ltr"
            autoComplete="username"
            className={field}
            {...register("username")}
          />
          {errors.username?.message ? (
            <p className="text-error text-[12px]" role="alert">
              {errors.username.message}
            </p>
          ) : availability ? (
            <p
              className={`text-[12px] ${
                availability.available ? "text-success" : "text-error"
              }`}
            >
              {availability.available
                ? t("usernameAvailable")
                : t("usernameTaken")}
            </p>
          ) : (
            <p className="text-ink-tertiary text-[12px]">{t("usernameHint")}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="city" className={label}>
            {t("city")}
          </label>
          <input
            id="city"
            dir="auto"
            autoComplete="address-level2"
            className={field}
            {...register("city")}
          />
        </div>

        {/* btn/primary — 651:16724 */}
        <AuthSubmit
          type="submit"
          disabled={isSubmitting || isTaken}
          className="text-on-accent mt-1 rounded-12 font-semibold"
        >
          {t("continue")}
        </AuthSubmit>
      </form>
    </OnboardingShell>
  );
}
