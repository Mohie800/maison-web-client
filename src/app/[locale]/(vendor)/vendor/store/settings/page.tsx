import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { apiFetch } from "@/lib/api/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatPrice } from "@/lib/format/money";

/**
 * Store Settings — `651:15059` light / `651:12472` dark.
 *
 * **Two of the frame's six cards are real.**
 *
 * *Delivery Methods* is `GET /shipping-options`, which returns exactly what the
 * frame draws — Express SAR 25, Standard SAR 10, Seller Self-Pickup free. It is
 * platform-wide and not seller-editable, so it is shown read-only with a line
 * saying as much, rather than with the frame's Edit link.
 *
 * *Store Status* is real and writable: `holidayMode` on the user, managed by
 * `/account/settings/vacation`, which already exists and handles the until-date
 * and the note. The toggle links there rather than duplicating it.
 *
 * Since Round 9 the **Free Shipping Threshold** and **Policies** fields are
 * writable, and they live on Edit Store where the rest of the store form is —
 * this screen links there rather than owning a second copy of them.
 *
 * Shipping Zones, Business Hours and the Danger Zone's Delete Store still have
 * no endpoints and are not rendered (plans/09 C82).
 */
export const metadata: Metadata = { robots: { index: false } };

interface ShippingOption {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  price: string;
  etaMinDays: number;
  etaMaxDays: number;
  isPickup: boolean;
  isActive: boolean;
}

export default async function StoreSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Vendor.storeSettings");
  const activeLocale = (await getLocale()) as Locale;

  const [user, options] = await Promise.all([
    getCurrentUser(),
    apiFetch<ShippingOption[]>("/shipping-options", {
      next: { revalidate: 3600, tags: ["shipping-options"] },
    }).catch(() => [] as ShippingOption[]),
  ]);

  const onHoliday = Boolean(user?.holidayMode);

  return (
    <>
      {/* TB — 651:15110 */}
      <h1 className="text-ink-900 text-[24px] leading-[29px] font-bold">
        {t("title")}
      </h1>

      <div className="flex flex-col gap-5 xl:flex-row">
        {/* SC — 651:15132 */}
        <section className="bg-base dark:bg-tint border-line-200 rounded-12 flex flex-col gap-3 border p-4 xl:w-[670px]">
          <div className="flex flex-col gap-1">
            <h2 className="text-ink-900 text-[14px] font-semibold">
              {t("delivery")}
            </h2>
            <p className="text-ink-500 dark:text-ink-450 text-[11px]">
              {t("deliveryNote")}
            </p>
          </div>
          <span className="bg-line-200 h-px w-full" aria-hidden />

          {options
            .filter((option) => option.isActive)
            .map((option) => (
              <div
                key={option.id}
                className="flex items-center justify-between gap-3 py-3.5"
              >
                <p className="text-ink-900 min-w-0 truncate text-[13px]" dir="auto">
                  {activeLocale === "ar" ? option.nameAr : option.nameEn}
                  {!option.isPickup && (
                    <span className="text-ink-500 dark:text-ink-450">
                      {" · "}
                      {t("days", {
                        min: option.etaMinDays,
                        max: option.etaMaxDays,
                      })}
                    </span>
                  )}
                </p>
                <p className="text-ink-500 dark:text-ink-450 shrink-0 text-[12px]">
                  {Number(option.price) === 0
                    ? t("free")
                    : formatPrice(option.price, "SAR")}
                </p>
              </div>
            ))}
        </section>

        <div className="flex flex-col gap-4 xl:w-[426px]">
          {/* SC — 651:15197 */}
          <section className="bg-base dark:bg-tint border-line-200 rounded-12 flex flex-col gap-3 border p-4">
            <h2 className="text-ink-900 text-[14px] font-semibold">
              {t("status")}
            </h2>
            <span className="bg-line-200 h-px w-full" aria-hidden />

            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-[2px]">
                <p className="text-ink-900 text-[13px]">{t("live")}</p>
                <p className="text-ink-500 dark:text-ink-450 text-[11px]">
                  {t("liveNote")}
                </p>
              </div>
              <Pill on={!onHoliday} />
            </div>

            <span className="bg-line-200 h-px w-full" aria-hidden />

            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-[2px]">
                <p className="text-ink-900 text-[13px]">{t("vacation")}</p>
                <p className="text-ink-500 dark:text-ink-450 text-[11px]">
                  {t("vacationNote")}
                </p>
              </div>
              <Link
                href="/account/settings/vacation"
                className="border-line-200 text-ink-900 rounded-8 flex h-8 shrink-0 items-center border px-3 text-[11px]"
              >
                {t("manage")}
              </Link>
            </div>
          </section>

          <section className="bg-base dark:bg-tint border-line-200 rounded-12 flex flex-col gap-3 border p-4">
            <h2 className="text-ink-900 text-[14px] font-semibold">
              {t("policies")}
            </h2>
            <span className="bg-line-200 h-px w-full" aria-hidden />
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-[2px]">
                <p className="text-ink-900 text-[13px]">{t("policiesRow")}</p>
                <p className="text-ink-500 dark:text-ink-450 text-[11px]">
                  {t("policiesNote")}
                </p>
              </div>
              <Link
                href="/vendor/store/edit"
                className="border-line-200 text-ink-900 rounded-8 flex h-8 shrink-0 items-center border px-3 text-[11px]"
              >
                {t("manage")}
              </Link>
            </div>
          </section>

          <p className="bg-vp-warn text-amber-text rounded-10 px-4 py-3 text-[11px]">
            {t("omitted")}
          </p>
        </div>
      </div>
    </>
  );
}

/** The frame's switch, read-only — the writable control lives on /account. */
function Pill({ on }: { on: boolean }) {
  return (
    <span
      className={`flex h-6 w-11 shrink-0 items-center rounded-[12px] px-[2px] ${
        on ? "bg-action justify-end" : "bg-line-200 justify-start"
      }`}
      aria-hidden
    >
      <span className="bg-base block size-5 rounded-[10px]" />
    </span>
  );
}
