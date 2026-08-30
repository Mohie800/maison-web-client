import type { Metadata } from "next";
import { getTranslations, setRequestLocale, getLocale } from "next-intl/server";
import {
  getBrands,
  getCategoryTree,
  getTrackSchema,
} from "@/lib/api/endpoints/catalog";
import { getPlatformFees } from "@/lib/api/endpoints/settings";
import { pickLocalized } from "@/lib/i18n/localized";
import { requireUser } from "@/lib/auth/current-user";
import { serverApiFetch } from "@/lib/api/server";
import {
  CATEGORY_TYPES,
  fromListing,
  type CategoryType,
  type SellDraft,
} from "@/features/sell/draft";
import { SellWizard } from "@/features/sell/components/sell-wizard";
import type { SellCategory, TrackSchema } from "@/features/sell/types";
import type { Category } from "@/lib/api/schemas/catalog";
import type { Locale } from "@/i18n/routing";

/**
 * Sell — the nine-step wizard, Figma `651:5102`.
 *
 * One route, not `/sell/[step]`. The draft itself is server-side since GAP-73
 * was answered: `?draft={id}` is what a refresh resumes from, and the wizard is
 * handed the listing read back rather than anything from the browser. The
 * reference data every step needs is loaded once here.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function SellPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ draft?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireUser(locale, "/sell");

  const { draft: draftId } = await searchParams;

  const activeLocale = (await getLocale()) as Locale;
  const t = await getTranslations("Sell");

  const [tree, rawBrands, fees, ...schemaList] = await Promise.all([
    getCategoryTree(),
    getBrands(),
    getPlatformFees(),
    ...CATEGORY_TYPES.map((type) => getTrackSchema(type).catch(() => null)),
  ]);

  const schemas = Object.fromEntries(
    CATEGORY_TYPES.map((type, index) => [type, schemaList[index] ?? null]),
  ) as Record<CategoryType, TrackSchema | null>;

  /*
    Resuming. A draft is only ever visible to its own seller, so a bad or
    someone else's id simply starts a fresh wizard rather than erroring — the
    id came from a URL the seller may have edited.
  */
  let initialDraft: SellDraft | null = null;
  if (draftId) {
    try {
      const listing = await serverApiFetch<Record<string, unknown>>(
        `/listings/${draftId}`,
        { cache: "no-store" },
      );
      if (listing?.status === "draft") {
        initialDraft = fromListing(listing, topCategoryOf(tree, listing));
      }
    } catch {
      // Not ours, gone, or already submitted — start clean.
    }
  }

  const localise = (nodes: Category[]): SellCategory[] =>
    nodes.map((node) => ({
      id: node.id,
      slug: node.slug,
      name: pickLocalized(node, "name", activeLocale) || node.name,
      iconUrl: node.iconUrl ?? null,
      children: node.children ? localise(node.children) : undefined,
    }));

  return (
    <>
      <h1 className="sr-only">{t("heading")}</h1>
      <SellWizard
        tree={localise(tree)}
        brands={rawBrands.map((brand) => ({
          id: brand.id,
          name: pickLocalized(brand, "name", activeLocale) || brand.name,
        }))}
        schemas={schemas}
        feePercent={fees.platformFeePercent}
        initialDraft={initialDraft}
        initialDraftId={initialDraft ? (draftId ?? null) : null}
      />
    </>
  );
}

/** Which top-level category a resumed draft's leaf sits under, for the chips. */
function topCategoryOf(
  tree: Category[],
  listing: Record<string, unknown>,
): string {
  const leafId =
    typeof listing.categoryId === "string" ? listing.categoryId : "";
  if (!leafId) return "";
  const contains = (node: Category): boolean =>
    node.id === leafId || (node.children ?? []).some(contains);
  return tree.find(contains)?.id ?? "";
}
