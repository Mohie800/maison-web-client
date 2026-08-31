import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Eye, Plane } from "lucide-react";
import { serverApiFetch } from "@/lib/api/server";
import { requireUser } from "@/lib/auth/current-user";
import { AccountSidebar } from "@/components/layout/account-sidebar";
import { setVacationModeAction } from "@/features/settings/actions";

/**
 * WEB_03_VacationMode — `656:228`.
 *
 * `GET /users/me/holiday-mode` reads it back and `PUT` writes it. The note the
 * frame does not draw a field for *is* on the write DTO, so it gets one: the
 * preview card at `656:322` promises shoppers "a friendly note that you're
 * away", and without an input that note could only ever be the API's default.
 */
export const metadata: Metadata = { robots: { index: false } };

interface HolidayMode {
  holidayMode?: boolean | null;
  holidayModeUntil?: string | null;
  holidayModeNote?: string | null;
}

export default async function VacationModePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireUser(locale, "/account/settings/vacation");

  const t = await getTranslations("Vacation");
  const query = await searchParams;
  const saved = query.saved === "1";
  const error = typeof query.error === "string" ? query.error : null;

  const state = await serverApiFetch<HolidayMode>("/users/me/holiday-mode", {
    cache: "no-store",
  }).catch(() => null);
  const on = state?.holidayMode === true;

  return (
    <div className="bg-surface min-h-screen">
      <div className="mx-auto flex max-w-[1440px] flex-col px-4 pt-8 pb-14 lg:px-20">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <AccountSidebar active="settings" />

          <div className="flex min-w-0 flex-1 flex-col gap-6">
            {/* Header — 656:302 */}
            <div className="flex flex-col gap-1.5">
              <h1 className="text-ink text-[28px] font-bold">{t("title")}</h1>
              <p className="text-ink-secondary text-[15px]">{t("subtitle")}</p>
            </div>

            {saved && (
              <p className="bg-action-tint text-action rounded-10 p-3 text-[13px] font-medium">
                {on ? t("savedOn") : t("savedOff")}
              </p>
            )}
            {error && (
              <p className="bg-error-tint text-error rounded-10 p-3 text-[13px] font-medium">
                {t("saveFailed")}
              </p>
            )}

            {/* Selling — 656:305 */}
            <form
              action={setVacationModeAction}
              className="bg-base border-line-200 flex flex-col gap-4 rounded-16 border p-7"
            >
              <input type="hidden" name="locale" value={locale} />

              <div className="flex items-center gap-3.5">
                <span className="bg-action-tint text-action flex size-11 shrink-0 items-center justify-center rounded-12">
                  <Plane className="size-6" aria-hidden />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <span className="text-ink text-[17px] font-bold">
                    {t("cardTitle")}
                  </span>
                  <span className="text-ink-secondary text-[13px]">
                    {t("cardSubtitle")}
                  </span>
                </span>
              </div>

              <span className="bg-line-subtle h-px w-full" aria-hidden />

              <p className="text-ink-secondary text-[14px] leading-[21px]">
                {t("bodyOn")}
              </p>
              <p className="text-ink-secondary text-[14px] leading-[21px]">
                {t("bodyOff")}
              </p>

              {/* ToggleRow — 656:316 */}
              <label className="bg-tint flex h-16 cursor-pointer items-center gap-3 rounded-12 px-5">
                <span className="text-ink flex-1 text-[15px] font-semibold">
                  {t("toggleLabel")}
                </span>
                <span className="text-ink-tertiary text-[13px]">
                  {on ? t("on") : t("off")}
                </span>
                <input
                  type="checkbox"
                  name="enabled"
                  defaultChecked={on}
                  className="accent-action size-5"
                />
              </label>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="vacation-note"
                  className="text-ink-700 text-[12px] font-medium"
                >
                  {t("noteLabel")}
                </label>
                <input
                  id="vacation-note"
                  name="note"
                  defaultValue={state?.holidayModeNote ?? ""}
                  maxLength={200}
                  placeholder={t("notePlaceholder")}
                  dir="auto"
                  className="bg-fill-50 border-line-200 text-ink-900 placeholder:text-ink-400 h-11 w-full rounded-8 border ps-3.5 text-[13px] outline-none"
                />
              </div>

              <button
                type="submit"
                className="bg-aqua text-on-accent h-11 w-fit rounded-[22px] px-6 text-[14px] font-bold"
              >
                {t("save")}
              </button>
            </form>

            {/* Preview — 656:322 */}
            <div className="bg-fill-100 flex items-center gap-3 rounded-12 p-4">
              <span className="bg-base text-ink-secondary flex size-8 shrink-0 items-center justify-center rounded-8">
                <Eye className="size-5" aria-hidden />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="text-ink text-[13px] font-semibold">
                  {t("previewTitle")}
                </span>
                <span className="text-ink-secondary text-[12px]" dir="auto">
                  “{state?.holidayModeNote?.trim() || t("previewDefault")}”
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
