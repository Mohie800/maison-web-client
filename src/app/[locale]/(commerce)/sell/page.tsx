import type { Metadata } from "next";
import { getTranslations, setRequestLocale, getLocale } from "next-intl/server";
import { getBrands, getCategoryTree, getTrackSchema } from "@/lib/api/endpoints/catalog";
import { getPlatformFees } from "@/lib/api/endpoints/settings";
import { pickLocalized } from "@/lib/i18n/localized";
import { requireUser } from "@/lib/auth/current-user";
import { CATEGORY_TYPES, type CategoryType } from "@/features/sell/draft";
import { SellWizard } from "@/features/sell/components/sell-wizard";
import type { SellCategory, TrackSchema } from "@/features/sell/types";
import type { Category } from "@/lib/api/schemas/catalog";
import type { Locale } from "@/i18n/routing";

/**
 * Sell — the nine-step wizard, Figma `651:5102`.
 *
 * One route, not `/sell/[step]`: the API has no partial listing to key a step
 * URL to (features/sell/draft.ts, GAP-73). The reference data every step needs
 * is loaded once here and handed to the client wizard.
 */
export const metadata: Metadata = { robots: { index: false } };

export default async function SellPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireUser(locale, "/sell");

  const activeLocale = (await getLocale()) as Locale;
  const t = await getTranslations("Sell");

  const [tree, rawBrands, fees, ...schemaList] = await Promise.all([
    getCategoryTree(),
    getBrands(),
    getPlatformFees(),
    ...CATEGORY_TYPES.map((type) =>
      getTrackSchema(type).catch(() => null),
    ),
  ]);

  const schemas = Object.fromEntries(
    CATEGORY_TYPES.map((type, index) => [type, schemaList[index] ?? null]),
  ) as Record<CategoryType, TrackSchema | null>;

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
      />
    </>
  );
}
