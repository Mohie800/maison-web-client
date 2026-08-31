import type { Metadata } from "next";
import { getTranslations, setRequestLocale, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { serverApiFetch } from "@/lib/api/server";
import { parseResponse } from "@/lib/api/parse";
import { requireUser } from "@/lib/auth/current-user";
import {
  COUPON_TABS,
  couponTab,
  isCouponTab,
  myCouponsSchema,
  type Coupon,
  type CouponTab,
} from "@/lib/api/schemas/coupon";
import { formatPrice } from "@/lib/format/money";
import { formatDate } from "@/lib/format/date";
import type { Locale } from "@/i18n/routing";
import { AccountSidebar } from "@/components/layout/account-sidebar";
import { CouponCard } from "@/features/wallet/components/coupon-card";

/**
 * Web_MyCoupons — `651:9400`.
 *
 * Three tabs off `GET /coupons/me`'s own `counts`, then the coupons as tinted
 * cards, then "Recently used" beneath them on the Available tab.
 *
 * **No account on dev has ever held a coupon** (plans/08 D1), so every row here
 * is rendered from a schema inferred from the published `CreateCouponDto`
 * rather than from a response anyone has seen. The card draws only what is
 * present, and the offer line is composed from `discountType` / `discountValue`
 * / `minOrderAmount` rather than read from a field — the frame's "Free shipping
 * on orders over SAR 300" is a sentence no column holds (plans/09 C59).
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function CouponsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireUser(locale, "/account/coupons");

  const t = await getTranslations("Coupons");
  const activeLocale = (await getLocale()) as Locale;
  const query = await searchParams;
  const tab: CouponTab = isCouponTab(query.tab) ? query.tab : "available";

  const data = await serverApiFetch<unknown>("/coupons/me", {
    cache: "no-store",
  })
    .then((raw) => parseResponse(myCouponsSchema, raw, "GET /coupons/me"))
    .catch(() => null);

  const items = data?.items ?? [];
  const counts = {
    available: data?.counts?.available ?? 0,
    used: data?.counts?.used ?? 0,
    expired: data?.counts?.expired ?? 0,
  };

  const rows = items.filter((row) => couponTab(row) === tab);
  const recentlyUsed =
    tab === "available"
      ? items.filter((row) => couponTab(row) === "used").slice(0, 3)
      : [];

  /** "10% off your next order", "Free shipping on orders over SAR 300". */
  const offerOf = (coupon: Coupon): string => {
    const currency = coupon.currency ?? "SAR";
    const min = coupon.minOrderAmount
      ? formatPrice(coupon.minOrderAmount, currency)
      : null;
    if (coupon.discountType === "free_shipping") {
      return min ? t("offer.freeShippingOver", { min }) : t("offer.freeShipping");
    }
    if (coupon.discountType === "fixed") {
      const amount = formatPrice(coupon.discountValue ?? 0, currency);
      return min
        ? t("offer.fixedOver", { amount, min })
        : t("offer.fixed", { amount });
    }
    const percent = String(coupon.discountValue ?? 0);
    return min
      ? t("offer.percentOver", { percent, min })
      : t("offer.percent", { percent });
  };

  const footerOf = (coupon: Coupon): string | null => {
    if (coupon.usedAt) {
      return t("usedOn", {
        date: formatDate(coupon.usedAt, activeLocale),
      });
    }
    if (coupon.expiresAt) {
      return t("expiresOn", {
        date: formatDate(coupon.expiresAt, activeLocale),
      });
    }
    return null;
  };

  return (
    <div className="bg-surface min-h-screen">
      <div className="mx-auto flex max-w-[1440px] flex-col px-4 pt-8 pb-14 lg:px-20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <AccountSidebar active="coupons" />

          <div className="flex min-w-0 flex-1 flex-col">
            {/* Tabs — 651:9415 */}
            <div className="flex items-center gap-8">
              {COUPON_TABS.map((key) => (
                <Link
                  key={key}
                  href={
                    key === "available"
                      ? "/account/coupons"
                      : `/account/coupons?tab=${key}`
                  }
                  aria-current={tab === key ? "page" : undefined}
                  className="flex flex-col gap-2"
                >
                  <span
                    className={`text-[14px] ${
                      tab === key
                        ? "text-ink font-semibold"
                        : "text-ink-tertiary font-medium"
                    }`}
                  >
                    {t(`tabs.${key}`)}
                    {counts[key] > 0 ? ` (${counts[key]})` : ""}
                  </span>
                  <span
                    className={`h-0.5 w-full ${
                      tab === key ? "bg-aqua" : "bg-transparent"
                    }`}
                    aria-hidden
                  />
                </Link>
              ))}
            </div>

            <h1 className="text-ink mt-8 text-[28px] font-bold">{t("title")}</h1>

            {data?.summary?.potentialSavings ? (
              <p className="text-ink-secondary mt-2 text-[14px]">
                {t("potentialSavings", {
                  amount: formatPrice(
                    data.summary.potentialSavings,
                    data.summary.currency ?? "SAR",
                  ),
                })}
              </p>
            ) : null}

            <span className="bg-line-subtle mt-6 h-px w-full" aria-hidden />

            {rows.length === 0 ? (
              <div className="border-line-200 mt-8 rounded-[14px] border border-dashed p-14 text-center">
                <p className="text-ink mb-2 text-[15px] font-semibold">
                  {t(`empty.${tab}.title`)}
                </p>
                <p className="text-ink-secondary mb-6 text-[13px]">
                  {t(`empty.${tab}.body`)}
                </p>
                <Link
                  href="/products"
                  className="border-aqua text-action inline-flex h-10 items-center rounded-20 border-[1.5px] px-[18px] text-[13px] font-bold"
                >
                  {t("browse")}
                </Link>
              </div>
            ) : (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((coupon, index) => (
                  <CouponCard
                    key={coupon.id ?? coupon.code}
                    coupon={coupon}
                    index={index}
                    used={tab !== "available"}
                    offer={offerOf(coupon)}
                    footer={footerOf(coupon)}
                    copyLabel={t("copy")}
                    copiedLabel={t("copied")}
                  />
                ))}
              </div>
            )}

            {recentlyUsed.length > 0 && (
              <>
                {/* 651:9441 */}
                <h2 className="text-ink mt-12 text-[18px] font-bold">
                  {t("recentlyUsed")}
                </h2>
                <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {recentlyUsed.map((coupon, index) => (
                    <CouponCard
                      key={coupon.id ?? coupon.code}
                      coupon={coupon}
                      index={index + 3}
                      used
                      offer={offerOf(coupon)}
                      footer={footerOf(coupon)}
                      copyLabel={t("copy")}
                      copiedLabel={t("copied")}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
