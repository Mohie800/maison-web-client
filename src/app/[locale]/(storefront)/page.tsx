import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getBanners, getCategoryTree } from "@/lib/api/endpoints/catalog";
import {
  getBestDeal,
  getEndingSoonAuctions,
  getFeaturedListings,
  getJustListed,
} from "@/lib/api/endpoints/listings";
import {
  getStoryGroups,
  getTopStores,
  getTrending,
} from "@/lib/api/endpoints/discovery";
import { listingToCard } from "@/lib/api/adapters";
import {
  AuctionsTeaser,
  EndingSoonSection,
} from "@/features/home/components/auction-sections";
import { Hero } from "@/features/home/components/hero";
import { PromoBanner } from "@/features/home/components/promo-banner";
import {
  CategoryRail,
  ProductRail,
  JustListedSection,
  TopSellersRail,
  TrendingRail,
  TrustBar,
} from "@/features/home/components/rails";
import { StoriesBar } from "@/features/home/components/stories-bar";
import { AiSearchBanner } from "@/features/home/components/ai-search-banner";

/**
 * Homepage — Figma node 651:543 (WEB-HOMEPAGE-1440).
 *
 * Rendered on the server and cached: every rail here is public, non-personalised
 * data. The personalised rails the API offers (`/home/trade-picks`,
 * `/home/discover`) are authenticated, so hydrating those client-side is
 * follow-up work rather than a reason to make the whole page dynamic.
 */

export const revalidate = 300;

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "Home" });
  return {
    title: t("metaTitle"),
    description: t("heroSubtitle"),
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Home");

  /**
   * One parallel batch: these have no dependencies on each other, so a slow
   * rail shouldn't delay the rest. Each endpoint sets its own revalidate window.
   */
  const [
    categories,
    heroBanners,
    midBanners,
    trending,
    topStores,
    stories,
    featured,
    justListed,
    auctions,
    bestDeal,
  ] = await Promise.all([
    getCategoryTree(),
    getBanners("home_hero"),
    getBanners("home_mid"),
    getTrending(7),
    getTopStores(6),
    getStoryGroups(),
    getFeaturedListings(4),
    getJustListed(20),
    getEndingSoonAuctions(4),
    getBestDeal().catch(() => null),
  ]);

  return (
    <>
      <StoriesBar groups={stories} />

      <Hero />

      <AiSearchBanner deal={bestDeal} />

      <CategoryRail categories={categories} />

      <ProductRail
        title={t("featuredTitle")}
        subtitle={t("featuredSubtitle")}
        actionHref="/products"
        cards={featured.map((l) => listingToCard(l))}
        surface="surface"
      />

      <AuctionsTeaser cards={auctions.map((l) => listingToCard(l))} />

      <TopSellersRail stores={topStores} />

      <PromoBanner banner={midBanners[0] ?? heroBanners[1]} />

      <TrendingRail cards={trending} />

      <EndingSoonSection cards={auctions.map((l) => listingToCard(l))} />

      <TrustBar />

      <JustListedSection
        cards={justListed.map((l) => listingToCard(l))}
        categories={categories}
      />
    </>
  );
}
