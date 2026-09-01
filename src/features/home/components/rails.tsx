import { getTranslations, getLocale } from "next-intl/server";
import {
  BadgeCheck,
  Headset,
  Lock,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ProductCard } from "@/components/commerce/product-card";
import { resolveMediaUrl } from "@/lib/api/media";
import { pickLocalized } from "@/lib/i18n/localized";
import { formatPrice, formatCount } from "@/lib/format/money";
import { Section, SectionHeader, SectionUnavailable } from "./section";
import { JustListedRail } from "./just-listed-rail";
import { rootCategoryIndex } from "@/lib/api/adapters";
import type { Category } from "@/lib/api/schemas/catalog";
import {
  cardAmount,
  type ProductCard as Card,
  type TopStore,
} from "@/lib/api/schemas/cards";
import type { Locale } from "@/i18n/routing";

/* ----------------------------------------------------------- categories */

/**
 * Card accents — Figma `651:605`. Each card takes the next colour in the run,
 * used for both the image band behind the photo and the Browse pill.
 *
 * Gold is the exception on text: green on gold fails contrast, so the frame
 * uses a dark amber there (`651:632`).
 */
const CATEGORY_TONE = [
  { band: "bg-aqua", link: "bg-aqua text-action" },
  { band: "bg-focus", link: "bg-focus text-action" },
  { band: "bg-gold", link: "bg-gold text-amber-text" },
  { band: "bg-purple", link: "bg-purple text-action" },
];

/**
 * Shop by Category — Figma `651:601`.
 *
 * The band shows `imageUrl`, the photograph, not `iconUrl` — the small mark
 * that belongs on chips. Both arrived with GAP-31, along with `listingCount`,
 * which rolls up the subtree.
 *
 * The design's second line ("Clothing, shoes, accessories") has no field behind
 * it: categories carry no description. It's built from the category's own first
 * three children, which is real data reading the way the design intends.
 */
export async function CategoryRail({ categories }: { categories: Category[] }) {
  const t = await getTranslations("Home");
  const locale = (await getLocale()) as Locale;

  return (
    <Section>
      <SectionHeader
        title={t("shopByCategory")}
        actionLabel={t("viewAll")}
        actionHref="/categories"
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
        {categories.slice(0, 4).map((category, index) => {
          const image = resolveMediaUrl(category.imageUrl ?? category.iconUrl);
          const tone = CATEGORY_TONE[index % CATEGORY_TONE.length];
          const children = (category.children ?? [])
            .slice(0, 3)
            .map((child) => pickLocalized(child, "name", locale))
            .join(", ");

          return (
            <article
              key={category.id}
              className="bg-base border-line-200 flex flex-col overflow-hidden rounded-16 border"
            >
              {/* Band — 651:607 */}
              <div className={`h-[180px] ${tone.band}`}>
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                  <img
                    src={image}
                    alt=""
                    className="size-full object-cover"
                    loading="lazy"
                  />
                ) : null}
              </div>
              {/* Ctn — 651:609 */}
              <div className="flex flex-1 flex-col gap-1.5 p-4">
                <h3
                  className="text-ink-900 text-[18px] font-semibold"
                  dir="auto"
                >
                  {pickLocalized(category, "name", locale)}
                </h3>
                {children && (
                  <p className="text-ink-500 truncate text-[12px]" dir="auto">
                    {children}
                  </p>
                )}
                {category.listingCount != null && (
                  <p className="text-action text-[12px] font-medium">
                    {t("itemsCount", {
                      count: formatCount(category.listingCount, locale),
                    })}
                  </p>
                )}
                <Link
                  href={`/products?categoryId=${category.id}`}
                  className={`mt-auto flex h-8 items-center justify-center rounded-[16px] px-3.5 text-[12px] font-medium ${tone.link}`}
                >
                  {t("browse")}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------- product rails */

/**
 * "Just Listed" — Figma node 651:1131. Category chips filter in place; see
 * JustListedRail for why the selection isn't a URL param.
 */
export async function JustListedSection({
  cards,
  categories,
}: {
  cards: Card[];
  categories: Category[];
}) {
  const t = await getTranslations("Home");
  const locale = (await getLocale()) as Locale;

  const chips = categories.map((category) => ({
    id: category.id,
    label: pickLocalized(category, "name", locale),
  }));

  // Cards sit on leaf categories; chips are top-level. Resolve each card up.
  const roots = rootCategoryIndex(categories);
  const rootByCard = Object.fromEntries(
    cards.map((card) => [
      card.id,
      card.category?.id ? (roots.get(card.category.id)?.id ?? null) : null,
    ]),
  );

  // Cards are rendered on the server and handed to the client component by id,
  // so filtering never costs a re-render of the card markup itself.
  const rendered = Object.fromEntries(
    cards.map((card) => [
      card.id,
      <ProductCard key={card.id} card={card} badge={t("newBadge")} />,
    ]),
  );

  return (
    <Section>
      <SectionHeader
        title={t("justListedTitle")}
        subtitle={t("justListedSubtitle")}
        actionLabel={t("viewAll")}
        actionHref="/products?sort=created_at_desc"
      />
      <JustListedRail
        cards={cards}
        chips={chips}
        allLabel={t("filterAll")}
        emptyLabel={t("nothingInCategory")}
        renderedCards={rendered}
        rootByCard={rootByCard}
      />
    </Section>
  );
}

export async function ProductRail({
  title,
  subtitle,
  actionHref,
  cards,
  surface = "base",
  emptyMessage,
}: {
  title: string;
  subtitle?: string;
  actionHref: string;
  cards: Card[];
  surface?: "base" | "surface";
  emptyMessage?: string;
}) {
  const t = await getTranslations("Home");

  return (
    <Section className={surface === "surface" ? "bg-surface" : undefined}>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        actionLabel={t("viewAll")}
        actionHref={actionHref}
      />

      {cards.length === 0 ? (
        <SectionUnavailable message={emptyMessage ?? t("nothingYet")} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {cards.map((card, i) => (
            <ProductCard key={card.id} card={card} priority={i < 4} />
          ))}
        </div>
      )}
    </Section>
  );
}

/* -------------------------------------------------------- top sellers */

/**
 * Section_TopVerifiedSellers — Figma `651:969`, card `651:976`.
 *
 * The card's stat pair is "Rating / Items". `ratingAvg` is on the seller, but
 * nothing in `/discovery/top-stores` carries a listing count, so the second
 * stat is `salesCount` — the ranking this rail is sorted by — labelled for what
 * it is rather than mislabelled "Items" (plans/09 C54).
 */
export async function TopSellersRail({ stores }: { stores: TopStore[] }) {
  const t = await getTranslations("Home");
  const locale = (await getLocale()) as Locale;

  return (
    <Section>
      <SectionHeader
        title={t("topSellers")}
        subtitle={t("topSellersSubtitle")}
        actionLabel={t("viewAll")}
        /* The Trend Hub's "Top Stores This Week" is this rail's full view; there is no separate /stores design. */
        actionHref="/trends"
      />

      {stores.length === 0 ? (
        // The ranking resets weekly; an empty week is a real state, not an error.
        <SectionUnavailable message={t("topSellersEmpty")} />
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:gap-5 lg:grid-cols-6">
          {stores.map((store) => {
            const seller = store.seller;
            const name = seller.fullName ?? seller.username ?? "";
            const avatar = resolveMediaUrl(seller.profilePic);
            return (
              <article
                key={seller.id}
                className="bg-base border-line-200 flex flex-col items-center gap-2.5 rounded-16 border px-4 py-5"
              >
                {/* Av — 651:977 */}
                <span className="bg-action-tint text-action flex size-14 items-center justify-center overflow-hidden rounded-[28px] text-[16px] font-bold">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                    <img
                      src={avatar}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    name.slice(0, 2).toUpperCase()
                  )}
                </span>
                {/* VBdg — 651:979 */}
                {seller.isVerified && (
                  <span className="bg-action-tint text-action flex h-5 items-center gap-1 rounded-10 px-2 text-[9px] font-bold">
                    <ShieldCheck className="size-3" aria-hidden />
                    {t("verified")}
                  </span>
                )}
                <h3
                  className="text-ink-900 w-full truncate text-center text-[13px] font-semibold"
                  dir="auto"
                >
                  {name}
                </h3>
                {seller.username && (
                  <p
                    className="text-ink-500 w-full truncate text-center text-[11px]"
                    dir="ltr"
                  >
                    @{seller.username}
                  </p>
                )}

                {/* R — 651:984 */}
                <div className="flex w-full items-stretch justify-center">
                  <div className="flex flex-1 flex-col items-center gap-0.5">
                    <span
                      className="text-ink-900 text-[13px] font-bold"
                      dir="ltr"
                    >
                      {seller.ratingAvg != null
                        ? Number(seller.ratingAvg).toFixed(1)
                        : "—"}
                    </span>
                    <span className="text-ink-500 text-[9px]">
                      {t("ratingStat")}
                    </span>
                  </div>
                  <span
                    className="bg-line-200 w-px self-center"
                    style={{ height: 28 }}
                    aria-hidden
                  />
                  <div className="flex flex-1 flex-col items-center gap-0.5">
                    <span
                      className="text-ink-900 text-[13px] font-bold"
                      dir="ltr"
                    >
                      {store.salesCount != null
                        ? formatCount(store.salesCount, locale)
                        : "—"}
                    </span>
                    <span className="text-ink-500 text-[9px]">
                      {t("soldStat")}
                    </span>
                  </div>
                </div>

                {/* StoreBtn — 651:992 */}
                <Link
                  /*
                    A store is a seller — same id the profile and
                    `listing.sellerId` use. `/stores/` never had a route.
                  */
                  href={`/sellers/${seller.id}`}
                  className="bg-surface border-action text-action mt-0.5 flex h-9 w-full items-center justify-center rounded-[18px] border text-[12px] font-bold"
                >
                  {t("visitStore")}
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </Section>
  );
}

/* ------------------------------------------------------------ trending */

/**
 * Rank badge tones — Figma `651:1218`. The frame colours the podium and then
 * settles: gold, silver, bronze, and brand green from fourth down. Gold and
 * bronze land on the same pair of tokens in the file.
 */
const RANK_TONE = [
  "bg-warn-tint text-warning",
  "bg-fill-100 text-ink-500",
  "bg-warn-tint text-warning",
];

export async function TrendingRail({ cards }: { cards: Card[] }) {
  const t = await getTranslations("Home");
  const tListing = await getTranslations("Listing");
  const locale = (await getLocale()) as Locale;

  const ranked = cards.slice(0, 7);
  const highlights = cards.slice(0, 4);

  return (
    <Section className="bg-surface">
      <SectionHeader
        title={t("trendingTitle")}
        subtitle={t("trendingSubtitle")}
        actionLabel={t("viewAll")}
        actionHref="/trends"
      />

      {cards.length === 0 ? (
        <SectionUnavailable message={t("nothingYet")} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* self-start: the ranked list is shorter than the card grid and
              should keep its natural height rather than stretch to match it. */}
          <ol className="bg-base border-line-200 divide-line-200 self-start divide-y overflow-hidden rounded-16 border">
            {ranked.map((card, index) => (
              <li key={card.id}>
                {/* R — 651:1219 */}
                <Link
                  href={`/products/${card.id}`}
                  className="hover:bg-surface flex items-center gap-3 px-4 py-3.5"
                >
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-[18px] text-[12px] font-bold ${
                      RANK_TONE[index] ?? "bg-action-tint text-action"
                    }`}
                  >
                    #{index + 1}
                  </span>

                  {/* Thumbnail, as in the design's ranked list. */}
                  <span className="bg-fill-100 size-11 shrink-0 overflow-hidden rounded-8">
                    {resolveMediaUrl(card.coverPhotoUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                      <img
                        src={resolveMediaUrl(card.coverPhotoUrl)!}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    ) : null}
                  </span>

                  <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <span
                      className="text-ink-900 truncate text-[13px] font-semibold"
                      dir="auto"
                    >
                      {card.title}
                    </span>
                    <span className="text-ink-500 truncate text-[11px]">
                      {[
                        card.category?.name,
                        card.condition &&
                          tListing(`conditions.${card.condition}`),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>

                  <span className="flex shrink-0 flex-col items-end gap-[3px]">
                    <span className="text-ink-900 text-[12px] font-bold">
                      {formatPrice(cardAmount(card), card.currency ?? "SAR")}
                    </span>
                    {/*
                      Likes, not views. The design's subtitle says "most viewed",
                      but /trends is documented as ordering by likes and returns
                      no viewCount at all — so this reports the field that
                      actually drives the ranking. See GAP-32.
                    */}
                    {card.likeCount != null && card.likeCount > 0 && (
                      <span className="text-ink-400 text-[10px]">
                        {t("likeCount", {
                          count: formatCount(card.likeCount, locale),
                        })}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ol>

          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            {highlights.map((card) => (
              <ProductCard key={card.id} card={card} />
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}

/* ------------------------------------------------------------ trust bar */

/**
 * Web_TrustBar — Figma `651:940`. Four promises in a row, each on its own tint.
 *
 * The frame's glyphs are material-symbols:verified, mdi:secure, refresh-2 and
 * ix:support; lucide carries the same four, so they are drawn from there like
 * every other icon in this codebase rather than exported one-off.
 */
export async function TrustBar() {
  const t = await getTranslations("Home");

  const items = [
    { key: "sellers", icon: BadgeCheck, tone: "bg-action-tint text-action" },
    { key: "payment", icon: Lock, tone: "bg-info-tint text-info" },
    { key: "returns", icon: RefreshCw, tone: "bg-purple-tint text-purple" },
    { key: "support", icon: Headset, tone: "bg-warn-tint text-amber-deep" },
  ] as const;

  return (
    <Section className="bg-base border-line-200 border-y py-12">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ key, icon: Icon, tone }) => (
          /* Trust — 651:942 */
          <div key={key} className="flex items-start gap-4">
            <span
              className={`flex size-12 shrink-0 items-center justify-center rounded-[24px] ${tone}`}
              aria-hidden
            >
              <Icon className="size-6" />
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="text-ink-900 text-[14px] font-bold">
                {t(`trust.${key}.title`)}
              </h3>
              <p className="text-ink-500 text-[12px]">
                {t(`trust.${key}.body`)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
