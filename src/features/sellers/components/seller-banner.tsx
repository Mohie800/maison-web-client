import { BadgeCheck, Zap, Crown } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { startConversationAction } from "@/features/inbox/actions";
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
 * **Message** is live now that Flow 7 exists. The API opens conversations
 * against a listing, never against a person (`POST /listings/{id}/conversations`),
 * so the button starts a thread on the seller's newest listing — the same
 * substitution the bundle page makes (plans/09 C50) — and is not rendered at all
 * for a seller with nothing listed.
 *
 * **Follow** stays disabled: `/sellers/{id}/followers` and `/following` are
 * reads, and no endpoint records a follow.
 */
export async function SellerBanner({
  seller,
  counts,
  messageListingId,
}: {
  seller: SellerProfile;
  counts: {
    sales: number;
    followers: number;
    rating: number | null;
    reviews: number;
  };
  /** The listing a "Message" thread is opened against; absent when none. */
  messageListingId?: string;
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
    {
      value: formatCount(counts.followers, locale),
      label: t("stats.followers"),
    },
    ...(memberSince
      ? [{ value: String(memberSince), label: t("stats.memberSince") }]
      : []),
  ];

  /* Trust flags, shown only when true — an absent badge says nothing. */
  const flags = [
    seller.isVerified && {
      key: "verified",
      icon: BadgeCheck,
      label: t("verified"),
    },
    seller.isPro && { key: "pro", icon: Crown, label: t("pro") },
    seller.isFastShipper && { key: "fast", icon: Zap, label: t("fastShipper") },
  ].filter(Boolean) as {
    key: string;
    icon: typeof BadgeCheck;
    label: string;
  }[];

  return (
    /* Banner — 651:9053 */
    <section className="bg-ink-900">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-7 px-4 py-8 sm:flex-row sm:items-center lg:px-20">
        {/* BigAv — 651:9054 */}
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt=""
            className="size-[88px] shrink-0 rounded-[44px] object-cover"
          />
        ) : (
          <span
            className="bg-action-tint text-action flex size-[88px] shrink-0 items-center justify-center rounded-[44px] text-[24px] font-bold"
            aria-hidden
          >
            {initials || "?"}
          </span>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {/* NR — 651:9057 */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Handles are Latin-script in both locales — no bidi isolation needed. */}
            <h1 className="text-base text-[24px] leading-tight font-bold">
              @{handle}
            </h1>
            {flags.map(({ key, icon: Icon, label }) => (
              /* VB — 651:9059 */
              <span
                key={key}
                className="bg-action text-base flex h-[26px] items-center gap-1 rounded-[13px] px-2.5 text-[11px] font-bold"
              >
                <Icon className="size-3" aria-hidden />
                {label}
              </span>
            ))}
          </div>

          {seller.bio && (
            <p className="text-ink-400 max-w-[520px] text-[13px]" dir="auto">
              {seller.bio}
            </p>
          )}

          {/* SR — 651:9062 */}
          <dl className="flex flex-wrap gap-x-8 gap-y-3">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-0.5">
                <dd className="text-aqua text-[16px] font-bold">
                  {stat.value}
                </dd>
                <dt className="text-ink-500 text-[11px]">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </div>

        {/* Actions — 651:9075 */}
        <div className="flex shrink-0 flex-col gap-2.5">
          {/*
            Follow is drawn but inert: no endpoint records one, so an enabled
            button would silently do nothing. Titled so the reason is
            discoverable rather than mysterious.
          */}
          <button
            type="button"
            disabled
            title={t("followSoon")}
            className="bg-aqua h-11 w-[144px] cursor-not-allowed rounded-[22px] text-[14px] font-bold text-black opacity-60"
          >
            {t("follow")}
          </button>

          {messageListingId && (
            <form action={startConversationAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="listingId" value={messageListingId} />
              <button
                type="submit"
                className="border-ink-700 text-base h-11 w-[144px] rounded-[22px] border text-[14px] font-medium"
              >
                {t("message")}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
