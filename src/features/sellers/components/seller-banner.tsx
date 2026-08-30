import { BadgeCheck, Zap, Crown } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatCount } from "@/lib/format/money";
import type { SellerProfile } from "@/lib/api/schemas/seller";
import type { Locale } from "@/i18n/routing";

/**
 * Seller profile banner — Figma node `651:9053`.
 *
 * The four stats are **not** read from the profile's own counters. Those are
 * never incremented: measured across the catalogue, every seller with real
 * followers or reviews reports `followersCount: 0` and `ratingAvg: null` while
 * the collections return 4–6 followers and an average of 4.5–5 (GAP-36). The
 * page fetches those collections anyway for the tabs, so it passes the totals
 * down and the banner is correct by construction.
 *
 * The design's **Message** button is not built: messaging is Phase 6 and has no
 * route, so it would be a dead control. Follow is rendered but disabled without
 * a session — `isFollowing` is always `false` anonymously, so an enabled button
 * would silently do nothing.
 */
export async function SellerBanner({
  seller,
  counts,
}: {
  seller: SellerProfile;
  counts: { sales: number; followers: number; rating: number | null; reviews: number };
}) {
  const t = await getTranslations("Seller");
  const locale = (await getLocale()) as Locale;

  const handle = seller.username ?? seller.fullName ?? "";
  const avatar = resolveMediaUrl(seller.profilePic);
  const memberSince = seller.createdAt
    ? new Date(seller.createdAt).getFullYear()
    : null;

  const initials = handle
    .split(/[\s_.-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");

  /*
   * Only stats the data supports. A "0.0" rating on a seller with no reviews
   * reads as a bad rating rather than an absent one, so it's dropped instead.
   */
  const stats: { value: string; label: string }[] = [
    { value: formatCount(counts.sales, locale), label: t("stats.sales") },
    ...(counts.rating !== null
      ? [{ value: counts.rating.toFixed(1), label: t("stats.rating") }]
      : []),
    { value: formatCount(counts.followers, locale), label: t("stats.followers") },
    ...(memberSince
      ? [{ value: String(memberSince), label: t("stats.memberSince") }]
      : []),
  ];

  /* Trust flags, shown only when true — an absent badge says nothing. */
  const flags = [
    seller.isVerified && { key: "verified", icon: BadgeCheck, label: t("verified") },
    seller.isPro && { key: "pro", icon: Crown, label: t("pro") },
    seller.isFastShipper && { key: "fast", icon: Zap, label: t("fastShipper") },
  ].filter(Boolean) as { key: string; icon: typeof BadgeCheck; label: string }[];

  return (
    <section className="bg-surface border-line border-b">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-8 sm:flex-row sm:items-start lg:px-20">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt=""
            className="size-[88px] shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            className="bg-tint text-ink-secondary flex size-[88px] shrink-0 items-center justify-center rounded-full text-[28px] font-semibold"
            aria-hidden
          >
            {initials || "?"}
          </span>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Handles are Latin-script in both locales — no bidi isolation needed. */}
            <h1 className="text-[24px] leading-tight font-bold">@{handle}</h1>
            {flags.map(({ key, icon: Icon, label }) => (
              <span
                key={key}
                className="bg-action-tint text-action text-caption flex items-center gap-1 rounded-[13px] px-2.5 py-1 font-semibold"
              >
                <Icon className="size-3.5" aria-hidden />
                {label}
              </span>
            ))}
          </div>

          {seller.bio && (
            <p className="text-body text-ink-secondary max-w-[520px]" dir="auto">
              {seller.bio}
            </p>
          )}

          <dl className="flex flex-wrap gap-x-8 gap-y-3">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col">
                <dd className="text-[18px] font-semibold">{stat.value}</dd>
                <dt className="text-caption text-ink-tertiary">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </div>

        {/*
          Follow needs a session and a mutation; it lands with the account work.
          Disabled rather than absent so the profile still reads like the design,
          and titled so the reason is discoverable rather than mysterious.
        */}
        <button
          type="button"
          disabled
          title={t("followSoon")}
          className="border-line text-label text-ink-tertiary h-11 w-[144px] shrink-0 cursor-not-allowed rounded-[22px] border font-semibold"
        >
          {t("follow")}
        </button>
      </div>
    </section>
  );
}
