import type { Metadata } from "next";
import { getTranslations, setRequestLocale, getLocale } from "next-intl/server";
import { Tag, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getMyListings } from "@/lib/api/endpoints/my-listings";
import { getWalletEarnings } from "@/lib/api/endpoints/wallet";
import {
  isDeletable,
  MY_LISTINGS_PAGE_SIZE,
  MY_LISTING_FILTERS,
  MY_LISTING_SORTS,
  type MyListingFilter,
  type MyListingSort,
} from "@/lib/api/schemas/my-listings";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatPrice, formatCount } from "@/lib/format/money";
import { formatDate } from "@/lib/format/date";
import { AccountSidebar } from "@/components/layout/account-sidebar";
import { Pagination } from "@/features/catalog/components/pagination";
import { deleteListingAction } from "@/features/listings/actions";
import type { Locale } from "@/i18n/routing";

/**
 * My Listings — Figma `651:9183`, with the empty state from `651:9376`.
 *
 * **All four of the design's stat cards are real now.** "Active Listings" is
 * `counts.live` and "Total Earned" is `/wallet/earnings`; "Sold This Month" and
 * "Expiring Soon" came with GAP-43's `stats` object, which also states the
 * windows behind them (`monthStart`, `expiringSoonWithinDays`) so neither card
 * has to guess what it is counting.
 *
 * **Eight tabs, not the design's four.** `expired`, `withdrawn` and `rejected`
 * are inventory the seller still owns, and the counts sum to `all` (GAP-44).
 *
 * **Edit is omitted.** It needs the sell wizard, which isn't built, and the API
 * only accepts edits to drafts anyway. Delete is shown for drafts only, which
 * is the one destructive action the API actually permits.
 */
export const metadata: Metadata = { robots: { index: false } };

/*
 * Keyed by `ListingStatus`, which is a longer list than the eight tabs: `sold`
 * and `traded` both sit under the `sold_out` tab, and `pending_review` and
 * `pending_payment` under `pending`. A row shows its own status, not its tab.
 */
const STATUS_TONE: Record<string, string> = {
  live: "bg-action-tint text-action",
  pending: "bg-[#FEF3C7] text-[#92400E]",
  pending_review: "bg-[#FEF3C7] text-[#92400E]",
  pending_payment: "bg-[#FEF3C7] text-[#92400E]",
  draft: "bg-tint text-ink-secondary",
  sold: "bg-invert text-white",
  sold_out: "bg-invert text-white",
  traded: "bg-invert text-white",
  rejected: "bg-[#FEE2E2] text-[#991B1B]",
  expired: "bg-tint text-ink-tertiary",
  withdrawn: "bg-tint text-ink-tertiary",
};

export default async function MyListingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("MyListings");
  const activeLocale = (await getLocale()) as Locale;
  const query = await searchParams;

  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const rawFilter = one(query.filter);
  const filter: MyListingFilter = MY_LISTING_FILTERS.includes(
    rawFilter as MyListingFilter,
  )
    ? (rawFilter as MyListingFilter)
    : "all";

  const rawSort = one(query.sort);
  const sort: MyListingSort = MY_LISTING_SORTS.includes(rawSort as MyListingSort)
    ? (rawSort as MyListingSort)
    : "newest";

  const rawPage = Number(one(query.page) ?? 1);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;

  const [listings, earnings] = await Promise.all([
    getMyListings({ filter, sort, page }),
    // Only for the "total earned" card; a failure here shouldn't break the page.
    getWalletEarnings().catch(() => null),
  ]);

  const counts = listings.counts ?? {};
  const stats = listings.stats;

  const href = (next: {
    filter?: MyListingFilter;
    sort?: MyListingSort;
    page?: number;
  }) => {
    const p = new URLSearchParams();
    const merged = { filter, sort, page, ...next };
    if (merged.filter !== "all") p.set("filter", merged.filter);
    if (merged.sort !== "newest") p.set("sort", merged.sort);
    if (merged.page > 1) p.set("page", String(merged.page));
    const q = p.toString();
    return `/account/listings${q ? `?${q}` : ""}`;
  };

  const isEmpty = (counts.all ?? listings.total) === 0;

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-8 lg:flex-row lg:px-20">
      <AccountSidebar active="listings" />

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-h1">{t("title")}</h1>
          {/*
            The design's "+ List New Item" button. The sell wizard is Phase 5
            and has no route, so this points at the flow's entry point only once
            it exists — until then it would be a dead button, and is omitted.
          */}
        </div>

        {isEmpty ? (
          <div className="border-line bg-base flex flex-col items-center rounded-16 border px-6 py-16 text-center">
            <span
              className="bg-action-tint text-action flex size-20 items-center justify-center rounded-full"
              aria-hidden
            >
              <Tag className="size-9" />
            </span>
            <h2 className="text-h2 mt-6">{t("emptyTitle")}</h2>
            <p className="text-body text-ink-secondary mt-3 max-w-[360px]">
              {t("emptyBody")}
            </p>
          </div>
        ) : (
          <>
            {/* The design's four cards — 651:9183. */}
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <li className="border-line bg-base flex flex-col gap-1 rounded-16 border p-5">
                <span className="text-[24px] font-bold">
                  {formatCount(counts.live ?? 0, activeLocale)}
                </span>
                <span className="text-caption text-ink-tertiary">
                  {t("stats.active")}
                </span>
              </li>
              <li className="border-line bg-base flex flex-col gap-1 rounded-16 border p-5">
                <span className="text-[24px] font-bold">
                  {formatCount(
                    stats?.soldThisMonth ?? counts.sold_out ?? 0,
                    activeLocale,
                  )}
                </span>
                <span className="text-caption text-ink-tertiary">
                  {stats?.soldThisMonth != null
                    ? t("stats.soldThisMonth")
                    : t("stats.sold")}
                </span>
                {stats?.monthStart && (
                  <span className="text-caption text-ink-tertiary">
                    {t("stats.monthNote", {
                      date: formatDate(stats.monthStart, activeLocale),
                    })}
                  </span>
                )}
              </li>
              {earnings?.totalEarnings != null && (
                <li className="border-line bg-base flex flex-col gap-1 rounded-16 border p-5">
                  <span className="text-[24px] font-bold" dir="ltr">
                    {formatPrice(earnings.totalEarnings, earnings.currency ?? "SAR")}
                  </span>
                  <span className="text-caption text-ink-tertiary">
                    {t("stats.earned")}
                  </span>
                </li>
              )}
              {stats?.expiringSoon != null && (
                <li className="border-line bg-base flex flex-col gap-1 rounded-16 border p-5">
                  <span className="text-[24px] font-bold">
                    {formatCount(stats.expiringSoon, activeLocale)}
                  </span>
                  <span className="text-caption text-ink-tertiary">
                    {t("stats.expiringSoon")}
                  </span>
                  {stats.expiringSoonWithinDays != null && (
                    <span className="text-caption text-ink-tertiary">
                      {t("stats.expiringSoonNote", {
                        days: stats.expiringSoonWithinDays,
                      })}
                    </span>
                  )}
                </li>
              )}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <ul className="flex flex-wrap gap-2">
                {MY_LISTING_FILTERS.map((option) => {
                  const active = option === filter;
                  const count = counts[option];
                  return (
                    <li key={option}>
                      <Link
                        href={href({ filter: option, page: 1 })}
                        aria-pressed={active}
                        className={`text-caption rounded-[16px] border px-3.5 py-1.5 ${
                          active
                            ? "border-action bg-action-tint text-action font-semibold"
                            : "border-line text-ink-secondary hover:border-ink-tertiary"
                        }`}
                      >
                        {t(`filters.${option}`)}
                        {count != null && ` (${count})`}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            {listings.items.length === 0 ? (
              <p className="border-line text-body text-ink-tertiary rounded-16 border p-10 text-center">
                {t("emptyFilter")}
              </p>
            ) : (
              /* Horizontal scroll rather than a squeezed table on small screens. */
              <div className="border-line bg-base overflow-x-auto rounded-16 border">
                <table className="w-full min-w-[820px] border-collapse">
                  <thead>
                    <tr className="border-line border-b">
                      {["item", "price", "status", "views", "likes", "listed", "expires", "actions"].map(
                        (col) => (
                          <th
                            key={col}
                            scope="col"
                            className="text-caption text-ink-tertiary px-4 py-3 text-start font-normal"
                          >
                            {t(`columns.${col}`)}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-line divide-y">
                    {listings.items.map((listing) => {
                      const image = resolveMediaUrl(listing.coverPhotoUrl);
                      return (
                        <tr key={listing.id}>
                          <td className="px-4 py-3">
                            <Link
                              href={`/products/${listing.id}`}
                              className="flex items-center gap-3"
                            >
                              <span className="bg-tint size-10 shrink-0 overflow-hidden rounded-[6px]">
                                {image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={image}
                                    alt=""
                                    className="size-full object-cover"
                                  />
                                ) : null}
                              </span>
                              <span className="text-label line-clamp-1" dir="auto">
                                {listing.title}
                              </span>
                            </Link>
                          </td>
                          <td className="text-caption px-4 py-3" dir="ltr">
                            {formatPrice(listing.price, listing.currency ?? "SAR")}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-caption rounded-[11px] px-2.5 py-1 font-semibold ${
                                STATUS_TONE[listing.status] ?? "bg-tint text-ink-secondary"
                              }`}
                            >
                              {t.has(`statuses.${listing.status}`)
                                ? t(`statuses.${listing.status}`)
                                : listing.status}
                            </span>
                            {/* Drafts show wizard progress — the resume hint. */}
                            {listing.status === "draft" &&
                              listing.currentStep != null &&
                              listing.totalSteps != null && (
                                <span className="text-caption text-ink-tertiary ms-2">
                                  {t("draftStep", {
                                    step: listing.currentStep,
                                    total: listing.totalSteps,
                                  })}
                                </span>
                              )}
                          </td>
                          <td className="text-caption px-4 py-3" dir="ltr">
                            {formatCount(listing.viewCount ?? 0, activeLocale)}
                          </td>
                          <td className="text-caption px-4 py-3" dir="ltr">
                            {formatCount(listing.likeCount ?? 0, activeLocale)}
                          </td>
                          <td className="text-caption text-ink-tertiary px-4 py-3">
                            {formatDate(listing.createdAt, activeLocale)}
                          </td>
                          <td className="text-caption text-ink-tertiary px-4 py-3">
                            {listing.expiresAt
                              ? formatDate(listing.expiresAt, activeLocale)
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {isDeletable(listing) ? (
                              <form action={deleteListingAction}>
                                <input type="hidden" name="locale" value={locale} />
                                <input type="hidden" name="id" value={listing.id} />
                                <button
                                  type="submit"
                                  aria-label={t("delete")}
                                  title={t("delete")}
                                  className="text-ink-tertiary hover:text-ink flex items-center gap-1.5"
                                >
                                  <Trash2 className="size-4" aria-hidden />
                                  <span className="text-caption">{t("delete")}</span>
                                </button>
                              </form>
                            ) : (
                              <span className="text-caption text-ink-tertiary">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination
              page={page}
              total={listings.total}
              pageSize={MY_LISTINGS_PAGE_SIZE}
              buildHref={(next) => href({ page: next })}
            />
          </>
        )}
      </div>
    </div>
  );
}
