import { getTranslations, getLocale } from "next-intl/server";
import { ShieldCheck, Store, Truck, Undo2 } from "lucide-react";
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

const CATEGORY_TONE = [
  "bg-aqua text-on-accent",
  "bg-azure text-white",
  "bg-gold text-black",
  "bg-purple text-white",
];

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

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {categories.slice(0, 4).map((category, index) => {
          const image = resolveMediaUrl(category.iconUrl);
          return (
            <article
              key={category.id}
              className="bg-base border-line flex flex-col overflow-hidden rounded-16 border"
            >
              <div className="bg-surface flex aspect-[4/3] items-center justify-center">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                  <img src={image} alt="" className="size-20 object-contain" />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-5">
                <h3 className="text-h3">
                  {pickLocalized(category, "name", locale)}
                </h3>
                <p className="text-caption text-ink-tertiary">
                  {t("subcategories", {
                    count: category.children?.length ?? 0,
                  })}
                </p>
                <Link
                  href={`/products?categoryId=${category.id}`}
                  className={`text-label mt-3 flex h-9 items-center justify-center rounded-[18px] font-semibold ${
                    CATEGORY_TONE[index % CATEGORY_TONE.length]
                  }`}
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
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card, i) => (
            <ProductCard key={card.id} card={card} priority={i < 4} />
          ))}
        </div>
      )}
    </Section>
  );
}

/* ------------------------------------------------------------- auctions */

/**
 * Live auction rails.
 *
 * Now fed by real data: `saleMode=auction` and the `ending_soon` sort both
 * shipped in the backend's gaps drop. An empty rail means there genuinely are no
 * live auctions, which is why this renders an empty state rather than the
 * "unavailable" notice it used to.
 */
export async function AuctionRail({
  cards,
  ending = false,
}: {
  cards: Card[];
  ending?: boolean;
}) {
  const t = await getTranslations("Home");

  return (
    <Section className="bg-invert">
      <SectionHeader
        invert
        title={ending ? t("endingSoon") : t("liveAuctions")}
        subtitle={ending ? t("endingSoonSubtitle") : undefined}
        actionLabel={t("viewAllAuctions")}
        actionHref="/auctions"
      />

      {cards.length === 0 ? (
        <SectionUnavailable invert message={t("noLiveAuctions")} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <ProductCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </Section>
  );
}

/* -------------------------------------------------------- top sellers */

export async function TopSellersRail({ stores }: { stores: TopStore[] }) {
  const t = await getTranslations("Home");
  const locale = (await getLocale()) as Locale;

  return (
    <Section>
      <SectionHeader
        title={t("topSellers")}
        subtitle={t("topSellersSubtitle")}
        actionLabel={t("viewAll")}
        actionHref="/stores"
      />

      {stores.length === 0 ? (
        // The ranking resets weekly; an empty week is a real state, not an error.
        <SectionUnavailable message={t("topSellersEmpty")} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-6">
          {stores.map((store) => {
            const name = store.name ?? store.fullName ?? store.handle ?? "";
            return (
              <article
                key={store.id ?? store.userId ?? name}
                className="bg-base border-line flex flex-col items-center gap-2 rounded-16 border p-5"
              >
                <span className="bg-action-tint text-action text-h3 flex size-14 items-center justify-center rounded-full">
                  {name.slice(0, 2).toUpperCase()}
                </span>
                {store.isVerified && (
                  <span className="text-[10px] text-action flex items-center gap-1 font-semibold">
                    <ShieldCheck className="size-3" aria-hidden />
                    {t("verified")}
                  </span>
                )}
                <h3 className="text-label truncate">{name}</h3>
                {store.handle && (
                  <p className="text-caption text-ink-tertiary truncate" dir="ltr">
                    @{store.handle}
                  </p>
                )}
                {store.unitsSold != null && (
                  <p className="text-caption text-ink-tertiary">
                    {formatCount(store.unitsSold, locale)}
                  </p>
                )}
                <Link
                  href={`/stores/${store.userId ?? store.id}`}
                  className="border-action text-action text-label mt-2 flex h-9 w-full items-center justify-center rounded-[18px] border"
                >
                  <Store className="me-1 size-4" aria-hidden />
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
          <ol className="bg-base border-line divide-line self-start divide-y overflow-hidden rounded-16 border">
            {ranked.map((card, index) => (
              <li key={card.id}>
                <Link
                  href={`/products/${card.id}`}
                  className="hover:bg-surface flex items-center gap-3 p-3"
                >
                  <span className="bg-action-tint text-action text-caption flex size-7 shrink-0 items-center justify-center rounded-full font-bold">
                    {index + 1}
                  </span>

                  {/* Thumbnail, as in the design's ranked list. */}
                  <span className="bg-surface size-10 shrink-0 overflow-hidden rounded-8">
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

                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-label truncate" dir="auto">
                      {card.title}
                    </span>
                    <span className="text-caption text-ink-tertiary truncate">
                      {[card.category?.name, card.condition && tListing(`conditions.${card.condition}`)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>

                  <span className="flex shrink-0 flex-col items-end">
                    <span className="text-label">
                      {formatPrice(cardAmount(card), card.currency ?? "SAR")}
                    </span>
                    {/*
                      Likes, not views. The design's subtitle says "most viewed",
                      but /trends is documented as ordering by likes and returns
                      no viewCount at all — so this reports the field that
                      actually drives the ranking. See GAP-32.
                    */}
                    {card.likeCount != null && card.likeCount > 0 && (
                      <span className="text-caption text-ink-tertiary">
                        {t("likeCount", { count: formatCount(card.likeCount, locale) })}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ol>

          <div className="grid gap-5 sm:grid-cols-2">
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

export async function TrustBar() {
  const t = await getTranslations("Home");

  const items = [
    { key: "authenticity", icon: ShieldCheck },
    { key: "shipping", icon: Truck },
    { key: "returns", icon: Undo2 },
    { key: "sellers", icon: Store },
  ] as const;

  return (
    <Section className="bg-surface border-line border-y">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ key, icon: Icon }) => (
          <div key={key} className="flex items-start gap-3">
            <Icon className="text-action size-6 shrink-0" aria-hidden />
            <div className="flex flex-col">
              <h3 className="text-label">{t(`trust.${key}.title`)}</h3>
              <p className="text-caption text-ink-secondary">
                {t(`trust.${key}.body`)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
