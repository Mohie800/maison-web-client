import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getOrders } from "@/lib/api/endpoints/orders";
import { getWishlist } from "@/lib/api/endpoints/wishlist";
import { getWallet } from "@/lib/api/endpoints/wallet";
import { getTradeRequestCounts } from "@/lib/api/endpoints/trade";
import { getCurrentUser } from "@/lib/auth/current-user";
import { orderLineCount, orderStatus } from "@/lib/api/schemas/order";
import { formatPrice } from "@/lib/format/money";
import { AccountSidebar } from "@/components/layout/account-sidebar";

/**
 * Account dashboard — Figma `651:8907` (Web_AccountDashboard).
 *
 * Every number is a real count: active orders from `GET /orders`, the wishlist
 * total, the wallet balance, and trade offers from
 * `GET /trade-requests/counts` — the badge-count endpoint, which exists even
 * though the trade screens themselves are Flow 6 and unbuilt.
 *
 * The frame's rows carry an item count and a status. The list response has
 * neither directly — `order.items` is null and there is no status column, both
 * live on `shipments[]` (GAP-78) — so both are derived, and the status is the
 * least-advanced parcel, since an order is only as far as its slowest one.
 *
 * The sidebar's "Vendor Portal" row is omitted, as everywhere else.
 */
export const metadata: Metadata = { robots: { index: false } };

/** Statuses that still need the buyer's attention — the frame's "active". */
const ACTIVE = new Set([
  "pending",
  "paid",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
]);

const BADGE: Record<string, string> = {
  shipped: "bg-info-tint text-info",
  out_for_delivery: "bg-info-tint text-info",
  processing: "bg-warn-tint text-amber-deep",
  packed: "bg-warn-tint text-amber-deep",
  pending: "bg-warn-tint text-amber-deep",
  paid: "bg-warn-tint text-amber-deep",
  delivered: "bg-action-tint text-action",
  cancelled: "bg-error-tint text-error",
  refunded: "bg-fill-100 text-ink-500",
};

export default async function AccountDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Dashboard");
  const tOrders = await getTranslations("Orders");

  const [user, orders, wishlist, wallet, trades] = await Promise.all([
    getCurrentUser(),
    getOrders("all", 1).catch(() => null),
    getWishlist().catch(() => null),
    getWallet().catch(() => null),
    getTradeRequestCounts().catch(() => null),
  ]);

  const rows = (orders?.items ?? []).slice(0, 3);
  const activeCount = (orders?.items ?? []).filter((order) =>
    ACTIVE.has(String(orderStatus(order))),
  ).length;
  const tradeOffers = trades?.received ?? 0;
  const firstName = (user?.fullName ?? "").split(" ")[0];

  const stats = [
    {
      key: "activeOrders",
      value: String(activeCount),
      tone: "bg-action-tint text-action",
    },
    {
      key: "wishlistItems",
      value: String(wishlist?.total ?? 0),
      tone: "bg-info-tint text-info",
    },
    {
      key: "walletBalance",
      value: formatPrice(wallet?.balance ?? 0, wallet?.currency ?? "SAR"),
      tone: "bg-warn-tint text-amber-deep",
    },
    {
      key: "tradeOffers",
      value: String(tradeOffers),
      tone: "bg-purple-tint text-purple-text",
    },
  ] as const;

  return (
    <div className="bg-surface min-h-screen">
      <div className="mx-auto flex max-w-[1440px] flex-col px-4 pt-8 pb-16 lg:px-20">
        {/* TR — 651:8908 */}
        <h1 className="pb-6 text-[28px] font-bold">{t("title")}</h1>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <AccountSidebar active="dashboard" />

          <div className="flex min-w-0 flex-1 flex-col gap-5">
            {/* Welcome — 651:8938 */}
            <section className="bg-ink-900 flex flex-wrap items-center justify-between gap-4 rounded-16 p-6">
              <div className="flex flex-col gap-1">
                <p className="text-base text-[22px] font-bold" dir="auto">
                  {firstName
                    ? t("welcomeNamed", { name: firstName })
                    : t("welcome")}
                </p>
                <p className="text-ink-400 text-[13px]">
                  {t("summary", { orders: activeCount, offers: tradeOffers })}
                </p>
              </div>
              <Link
                href="/sell"
                className="bg-aqua flex h-10 shrink-0 items-center rounded-20 px-5 text-[13px] font-bold text-black"
              >
                {t("listItem")}
              </Link>
            </section>

            {/* Stats — 651:8944 */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.key}
                  className={`flex flex-col gap-1 rounded-12 p-5 ${stat.tone}`}
                >
                  <span className="text-[24px] font-bold" dir="ltr">
                    {stat.value}
                  </span>
                  <span className="text-[12px]">{t(`stats.${stat.key}`)}</span>
                </div>
              ))}
            </div>

            {/* OH — 651:8957 */}
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[18px] font-semibold">{t("recentOrders")}</h2>
              <Link
                href="/account/orders"
                className="text-action flex items-center gap-1 text-[13px] font-medium"
              >
                {t("viewAll")}
                <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
              </Link>
            </div>

            {rows.length === 0 ? (
              <div className="bg-base border-line rounded-12 border border-dashed p-10 text-center">
                <p className="text-body-lg mb-2">{t("noOrdersTitle")}</p>
                <p className="text-body text-ink-secondary mb-6">
                  {t("noOrdersBody")}
                </p>
                <Link
                  href="/products"
                  className="bg-aqua text-on-accent inline-flex h-11 items-center rounded-[22px] px-6 text-[13px] font-bold"
                >
                  {t("startShopping")}
                </Link>
              </div>
            ) : (
              rows.map((order) => {
                const status = orderStatus(order) ?? "";
                return (
                  /* ORow — 651:8960 */
                  <article
                    key={order.id}
                    className="bg-base border-line flex flex-wrap items-center gap-4 rounded-12 border px-4 py-3.5"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[13px] font-semibold" dir="ltr">
                        #{order.orderNumber ?? order.id.slice(0, 8)}
                      </span>
                      <span className="text-ink-500 text-[12px]">
                        {t("orderLine", {
                          count: orderLineCount(order),
                          amount: formatPrice(
                            order.totalAmount,
                            order.currency ?? "SAR",
                          ),
                        })}
                      </span>
                    </div>
                    {status && (
                      <span
                        className={`flex h-6 shrink-0 items-center rounded-12 px-2.5 text-[11px] font-medium ${
                          BADGE[status] ?? "bg-fill-100 text-ink-500"
                        }`}
                      >
                        {tOrders.has(`statuses.${status}` as never)
                          ? tOrders(`statuses.${status}` as never)
                          : status}
                      </span>
                    )}
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="border-line text-ink-700 flex h-8 shrink-0 items-center rounded-8 border px-3.5 text-[12px] font-medium"
                    >
                      {t("track")}
                    </Link>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
