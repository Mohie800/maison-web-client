import type { Metadata } from "next";
import { getTranslations, setRequestLocale, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSeller, getSellerItems } from "@/lib/api/endpoints/sellers";
import { requireUser } from "@/lib/auth/current-user";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatPrice } from "@/lib/format/money";
import { formatDate } from "@/lib/format/date";
import type { Locale } from "@/i18n/routing";

/**
 * Web_Profile_Own — `651:8984`.
 *
 * Your own seller profile, seen as the owner: the public banner plus Edit
 * profile and Public page. Distinct from `/account` (the dashboard,
 * `651:8907`), `/sellers/[id]` (the same seller seen by someone else,
 * `651:9052`) and `/account/listings` (the management table, `651:9183`).
 *
 * `GET /sellers/{id}` answers `isSelf: true` for your own id and carries a
 * `stats` block with three of the banner's four figures. Two notes:
 *
 * - **"Trades" is dropped.** No payload anywhere counts a user's completed
 *   trades (plans/09 C42), so the banner prints three stats, not four.
 * - **"Listed" is `stats.items`.** That count exists after all, which settles
 *   the open half of C54 — the seller *card* was told there was none because it
 *   only ever saw the thin embedded seller, not this endpoint.
 *
 * Six of the eight tabs are links to the surfaces that already own that
 * content; Listed and Sold render here, which is what the frame draws
 * (plans/09 C62).
 */
export const metadata: Metadata = { robots: { index: false } };

const TABS = [
  { key: "shop", href: (id: string) => `/sellers/${id}` },
  { key: "listed", href: () => "/account/profile" },
  { key: "sold", href: () => "/account/profile?tab=sold" },
  { key: "purchased", href: () => "/account/orders" },
  { key: "trades", href: () => "/account/trades" },
  { key: "auctions", href: () => "/account/bids" },
  { key: "reviews", href: (id: string) => `/sellers/${id}#reviews` },
  { key: "wishlist", href: () => "/account/wishlist" },
] as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

export default async function OwnProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale, "/account/profile");

  const t = await getTranslations("OwnProfile");
  const activeLocale = (await getLocale()) as Locale;
  const query = await searchParams;
  const sold = query.tab === "sold";

  const [seller, items] = await Promise.all([
    getSeller(user.id).catch(() => null),
    getSellerItems(user.id, {
      filter: sold ? "sold" : "available",
      limit: 24,
    }).catch(() => null),
  ]);

  const stats = seller?.stats ?? null;
  const name = seller?.fullName ?? user.fullName ?? user.username ?? "";
  const avatar = resolveMediaUrl(seller?.profilePic ?? user.profilePic);
  const rows = items?.items ?? [];

  const meta = [
    seller?.username ? `@${seller.username}` : null,
    seller?.createdAt
      ? t("memberSince", { date: formatDate(seller.createdAt, activeLocale) })
      : null,
    seller?.city ?? null,
  ].filter(Boolean);

  return (
    <div className="bg-surface min-h-screen">
      <div className="mx-auto flex max-w-[1440px] flex-col px-4 pt-10 pb-14 lg:px-20">
        {/* banner — 651:8998 */}
        <div className="bg-base border-line-200 flex flex-col gap-6 rounded-20 border p-8 lg:flex-row lg:items-start">
          <span className="bg-tint text-ink-secondary flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full text-[22px] font-bold">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
              <img src={avatar} alt="" className="size-full object-cover" />
            ) : (
              initials(name || "?")
            )}
          </span>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-ink text-[22px] font-bold" dir="auto">
                {name}
              </h1>
              {seller?.isVerified && (
                <span className="bg-aqua-tint text-success rounded-[6px] px-2.5 py-1 text-[10px] font-bold tracking-[0.4px]">
                  {t("verified")}
                </span>
              )}
            </div>
            {meta.length > 0 && (
              <p className="text-ink-secondary text-[13px]">
                {meta.join(" · ")}
              </p>
            )}

            {/* Three stats, not the frame's four — nothing counts trades. */}
            <div className="mt-3 flex flex-wrap gap-x-12 gap-y-4">
              <Stat value={stats?.items ?? 0} label={t("stats.listed")} />
              <Stat value={stats?.itemsSold ?? 0} label={t("stats.sold")} />
              <Stat
                value={stats?.rating ?? "—"}
                label={t("stats.rating")}
                muted={!stats?.ratingCount}
              />
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2">
            <Link
              href="/account/settings/profile"
              className="bg-base border-line-200 text-ink flex h-[42px] w-[140px] items-center justify-center rounded-12 border text-[14px] font-semibold"
            >
              {t("editProfile")}
            </Link>
            <Link
              href={`/sellers/${user.id}`}
              className="bg-ink-900 text-base flex h-[42px] w-[140px] items-center justify-center rounded-12 text-[14px] font-semibold"
            >
              {t("publicPage")}
            </Link>
          </div>
        </div>

        {/* Tabs — 651:9017 */}
        <div className="scrollbar-none mt-8 flex items-center gap-8 overflow-x-auto">
          {TABS.map((tab) => {
            const active =
              (tab.key === "listed" && !sold) || (tab.key === "sold" && sold);
            return (
              <Link
                key={tab.key}
                href={tab.href(user.id)}
                aria-current={active ? "page" : undefined}
                className="flex shrink-0 flex-col gap-2"
              >
                <span
                  className={`text-[14px] ${
                    active ? "text-ink font-semibold" : "text-ink-secondary"
                  }`}
                >
                  {t(`tabs.${tab.key}`)}
                </span>
                <span
                  className={`h-0.5 w-full ${
                    active ? "bg-aqua" : "bg-transparent"
                  }`}
                  aria-hidden
                />
              </Link>
            );
          })}
        </div>
        <span className="bg-line-subtle mt-0 h-px w-full" aria-hidden />

        <h2 className="text-ink mt-8 text-[18px] font-bold">
          {sold
            ? t("soldItems", { count: items?.total ?? rows.length })
            : t("listedItems", { count: items?.total ?? rows.length })}
        </h2>

        {rows.length === 0 ? (
          <div className="border-line-200 mt-6 rounded-[14px] border border-dashed p-14 text-center">
            <p className="text-ink mb-2 text-[15px] font-semibold">
              {t(sold ? "emptySold" : "emptyListed")}
            </p>
            <Link
              href="/sell"
              className="border-aqua text-action mt-4 inline-flex h-10 items-center rounded-20 border-[1.5px] px-[18px] text-[13px] font-bold"
            >
              {t("startSelling")}
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {rows.map((item) => {
              /* A seller item's `photos` are `{ url }`, not the listing's
                 fuller photo rows — so no `coverPhotoUrl` here. */
              const photo = resolveMediaUrl(item.photos?.[0]?.url);
              const live = item.status === "live";
              return (
                /* item — 651:9028 */
                <Link
                  key={item.id}
                  href={`/products/${item.id}`}
                  className="bg-base border-line-200 flex flex-col gap-2 rounded-[14px] border p-3"
                >
                  <span className="bg-fill-100 relative block h-[140px] w-full overflow-hidden rounded-10">
                    {photo && (
                      // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                      <img
                        src={photo}
                        alt=""
                        className="size-full object-cover"
                      />
                    )}
                    <span
                      className={`absolute start-2 top-2 rounded-[6px] px-2.5 py-1 text-[10px] font-bold tracking-[0.4px] ${
                        live
                          ? "bg-success-tint3 text-success"
                          : "bg-warn-tint text-amber-deep"
                      }`}
                    >
                      {t(`status.${live ? "live" : "pending"}`)}
                    </span>
                  </span>
                  <span
                    className="text-ink truncate text-[13px] font-medium"
                    dir="auto"
                  >
                    {item.title}
                  </span>
                  <span className="text-ink text-[13px] font-bold" dir="ltr">
                    {formatPrice(item.price, item.currency ?? "SAR")}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  muted = false,
}: {
  value: string | number;
  label: string;
  muted?: boolean;
}) {
  return (
    <span className="flex flex-col gap-0.5">
      <span
        className={`text-[20px] font-extrabold ${muted ? "text-ink-tertiary" : "text-ink"}`}
        dir="ltr"
      >
        {value}
      </span>
      <span className="text-ink-tertiary text-[12px]">{label}</span>
    </span>
  );
}
