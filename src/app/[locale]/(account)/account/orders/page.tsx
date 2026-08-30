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
 *
 * The design draws five tabs; the API's enum has six. **Pending** is rendered
 * too — an order awaiting processing would otherwise be visible only under
 * "All". Same call as the My Listings tabs (plans/09 C7, C29).
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

  const tabHref = (value: OrderTab, atPage?: number) => {
    const p = new URLSearchParams();
    if (value !== "all") p.set("tab", value);
    if (atPage && atPage > 1) p.set("page", String(atPage));
    const qs = p.toString();
    return qs ? `/account/orders?${qs}` : "/account/orders";
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 lg:px-20">
      <h1 className="text-h1 mb-6">{t("accountTitle")}</h1>

      <div className="flex flex-col gap-8 lg:flex-row">
        <AccountSidebar active="orders" />

        <div className="min-w-0 flex-1">
          {/* Tabs are links, so each filter is its own URL and works without JS. */}
          <nav className="bg-base mb-5 flex flex-wrap items-center gap-6 rounded-16 px-6 py-4">
            {ORDER_TABS.map((value) => {
              const active = value === tab;
              const count = counts[value as keyof typeof counts];
              return (
                <Link
                  key={value}
                  href={tabHref(value)}
                  aria-current={active ? "page" : undefined}
                  className={`text-body ${
                    active
                      ? "text-ink font-semibold"
                      : "text-ink-tertiary hover:text-ink-secondary"
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
            <div className="flex flex-col items-center gap-4 py-14 text-center">
              <span className="bg-info-tint2 flex size-16 items-center justify-center rounded-full">
                <Package className="text-info size-7" aria-hidden />
              </span>
              <h2 className="text-h2">
                {tab === "all" ? t("emptyTitle") : t("emptyTabTitle")}
              </h2>
              <p className="text-body text-ink-secondary max-w-[360px] whitespace-pre-line">
                {tab === "all" ? t("emptyBody") : t("emptyTabBody")}
              </p>
              {tab === "all" && (
                <div className="mt-2 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/products"
                    className="bg-action text-label flex h-12 items-center rounded-[24px] px-7 font-semibold text-white"
                  >
                    {t("startShopping")}
                  </Link>
                  <Link
                    href="/categories"
                    className="border-line bg-base text-label flex h-12 items-center rounded-[24px] border px-7 font-semibold"
                  >
                    {t("browseCategories")}
                  </Link>
                </div>
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
                  href={tabHref(tab, n)}
                  aria-current={n === page ? "page" : undefined}
                  className={`text-caption flex size-9 items-center justify-center rounded-[10px] ${
                    n === page
                      ? "bg-invert font-semibold text-white"
                      : "border-line bg-base text-ink-secondary border"
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
