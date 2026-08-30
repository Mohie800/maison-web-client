"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthSubmit } from "@/components/form/field";
import { browserApiFetch } from "@/lib/api/browser";
import { ApiError } from "@/lib/api/errors";
import { pickLocalized } from "@/lib/i18n/localized";
import type { Locale } from "@/i18n/routing";
import { OnboardingShell } from "./onboarding-shell";

interface InterestCategory {
  id: string;
  nameEn: string | null;
  nameAr: string | null;
  type: string;
}

/** The API requires at least 3, or an empty array to skip. */
const MINIMUM = 3;

/**
 * Step 2 — Figma `651:16726`. Chips on a card, then "Start exploring".
 *
 * The frame has no skip; the API's documented skip is an empty array, and
 * without it an account that wants no personalisation is stuck behind a
 * three-pick minimum, so the quiet link stays (plans/09 C55).
 */
export function InterestsForm() {
  const t = useTranslations("Auth");
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: categories = [], isPending } = useQuery({
    queryKey: ["users", "categories"],
    queryFn: () => browserApiFetch<InterestCategory[]>("/users/categories"),
  });

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit(categoryIds: string[]) {
    setSubmitting(true);
    setError(null);
    try {
      await browserApiFetch("/users/me/favorite-categories", {
        method: "POST",
        body: { categoryIds },
      });
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <OnboardingShell
      step={2}
      wordmark={t("wordmark")}
      stepLabel={t("stepTwo")}
      width="wide"
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-ink-900 text-[20px] font-bold">
            {t("interestsTitle")}
          </h1>
          <p className="text-ink-secondary text-[13px]">
            {t("interestsSubtitle")}
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isPending ? (
          <div className="flex flex-wrap gap-2.5">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="bg-tint h-10 w-24 animate-pulse rounded-20"
              />
            ))}
          </div>
        ) : (
          /* chip — 651:16735 */
          <div className="flex flex-wrap gap-2.5">
            {categories.map((category) => {
              const isOn = selected.has(category.id);
              return (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={isOn}
                  onClick={() => toggle(category.id)}
                  className={`flex h-10 items-center rounded-20 px-3.5 text-[13px] font-semibold ${
                    isOn
                      ? "bg-aqua text-on-accent"
                      : "bg-surface border-line text-ink-900 border"
                  }`}
                >
                  {pickLocalized(category, "name", locale)}
                </button>
              );
            })}
          </div>
        )}

        {/* btn/primary — 651:16755 */}
        <AuthSubmit
          onClick={() => submit([...selected])}
          disabled={submitting || selected.size < MINIMUM}
          className="text-on-accent mt-3 rounded-12 font-semibold"
        >
          {t("startExploring")}
        </AuthSubmit>

        {/* An empty array is the documented "skip" signal. */}
        <button
          type="button"
          onClick={() => submit([])}
          disabled={submitting}
          className="text-ink-tertiary text-[12px]"
        >
          {t("skipInterests")}
        </button>
      </div>
    </OnboardingShell>
  );
}
