import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Package } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getOrders, ORDERS_PAGE_SIZE } from "@/lib/api/endpoints/orders";
import { AccountSidebar } from "@/components/layout/account-sidebar";
import { OrderCard } from "@/features/orders/components/order-card";
import { ORDER_TABS, type OrderTab } from "@/lib/api/schemas/order";

/**
 * My Orders — Figma nodes 651:8208 and 651:8327 (empty state).
 *
 * Tabs are server-filtered: `GET /orders?tab=` and the `counts` object shipped
 * in the backend's gaps drop, so the badge numbers are real totals rather than
 * counts of the current page.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Orders");
  const query = await searchParams;

  const raw = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const tab: OrderTab = ORDER_TABS.includes(raw as OrderTab)
    ? (raw as OrderTab)
    : "all";

  const rawPage = Number(
    (Array.isArray(query.page) ? query.page[0] : query.page) ?? 1,
  );
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;

  const result = await getOrders(tab, page);
  const counts = result.counts ?? {};
  const pageCount = Math.max(1, Math.ceil(result.total / ORDERS_PAGE_SIZE));

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 lg:px-20">
      <h1 className="text-h1 mb-6">{t("accountTitle")}</h1>

      <div className="flex flex-col gap-8 lg:flex-row">
        <AccountSidebar active="orders" />

        <div className="min-w-0 flex-1">
          {/* Tabs are links, so each filter is its own URL and works without JS. */}
          <nav className="bg-base border-line mb-5 flex flex-wrap gap-1 rounded-16 border p-2">
            {ORDER_TABS.map((value) => {
              const active = value === tab;
              const count = counts[value as keyof typeof counts];
              return (
                <Link
                  key={value}
                  href={
                    value === "all"
                      ? "/account/orders"
                      : `/account/orders?tab=${value}`
                  }
                  aria-current={active ? "page" : undefined}
                  className={`text-caption rounded-12 px-4 py-2 ${
                    active
                      ? "bg-action-tint text-action font-semibold"
                      : "text-ink-secondary hover:bg-surface"
                  }`}
                >
                  {t(`tabs.${value}`)}
                  {typeof count === "number" && count > 0 && (
                    <span className="text-ink-tertiary ms-1.5">{count}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {result.items.length === 0 ? (
            <div className="bg-base border-line flex flex-col items-center gap-3 rounded-16 border p-14 text-center">
              <Package className="text-ink-tertiary size-10" aria-hidden />
              <h2 className="text-h3">
                {tab === "all" ? t("emptyTitle") : t("emptyTabTitle")}
              </h2>
              <p className="text-body text-ink-secondary">
                {tab === "all" ? t("emptyBody") : t("emptyTabBody")}
              </p>
              {tab === "all" && (
                <Link
                  href="/products"
                  className="bg-aqua text-on-accent text-label mt-2 flex h-12 items-center rounded-[24px] px-6 font-semibold"
                >
                  {t("startShopping")}
                </Link>
              )}
            </div>
          ) : (
            <ul className="flex flex-col gap-5">
              {result.items.map((order) => (
                <li key={order.id}>
                  <OrderCard order={order} />
                </li>
              ))}
            </ul>
          )}

          {pageCount > 1 && (
            <nav
              aria-label={t("pagination")}
              className="mt-8 flex justify-center gap-2"
            >
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={
                    tab === "all"
                      ? `/account/orders?page=${n}`
                      : `/account/orders?tab=${tab}&page=${n}`
                  }
                  aria-current={n === page ? "page" : undefined}
                  className={`text-caption flex size-9 items-center justify-center rounded-[10px] ${
                    n === page
                      ? "bg-invert font-semibold text-white"
                      : "border-line text-ink-secondary border"
                  }`}
                >
                  {n}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
