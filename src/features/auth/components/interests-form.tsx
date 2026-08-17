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

interface InterestCategory {
  id: string;
  nameEn: string | null;
  nameAr: string | null;
  type: string;
}

/** The API requires at least 3, or an empty array to skip. */
const MINIMUM = 3;

export function InterestsForm() {
  const t = useTranslations("Auth");
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: categories = [], isPending } = useQuery({
    queryKey: ["users", "categories"],
    queryFn: () =>
      browserApiFetch<InterestCategory[]>("/users/categories"),
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
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-ink-900 text-[28px] leading-tight font-bold">{t("interestsTitle")}</h1>
        <p className="text-ink-500 text-[14px]">
          {t("interestsSubtitle")}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isPending ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-tint h-12 animate-pulse rounded-12" />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const isOn = selected.has(category.id);
            return (
              <button
                key={category.id}
                type="button"
                aria-pressed={isOn}
                onClick={() => toggle(category.id)}
                className={`text-label h-10 rounded-12 border px-4 ${
                  isOn
                    ? "border-action bg-action-tint text-action"
                    : "border-line text-ink-secondary"
                }`}
              >
                {pickLocalized(category, "name", locale)}
              </button>
            );
          })}
        </div>
      )}

      <AuthSubmit
        onClick={() => submit([...selected])}
        disabled={submitting || selected.size < MINIMUM}
       
      >
        {t("finish")}
      </AuthSubmit>

      {/* An empty array is the documented "skip" signal. */}
      <button
        type="button"
        onClick={() => submit([])}
        disabled={submitting}
        className="text-caption text-ink-tertiary"
      >
        {t("continue")}
      </button>
    </div>
  );
}
