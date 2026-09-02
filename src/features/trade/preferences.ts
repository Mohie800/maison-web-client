import "server-only";
import { getCategoryTree } from "@/lib/api/endpoints/catalog";
import { pickLocalized } from "@/lib/i18n/localized";
import type { Category } from "@/lib/api/schemas/catalog";
import type { TradePreferredCategory } from "@/lib/api/schemas/listing";
import type { Locale } from "@/i18n/routing";

export interface TradePreferenceChip {
  id: string;
  name: string;
}

/**
 * The chip labels for "Looking to trade for" (GAP-97).
 *
 * `GET /listings/{id}` embeds the categories the seller picked, in their order,
 * so the row needs no lookup to draw — but the embedded objects carry `name`
 * and `nameEn` only, never `nameAr`. On the Arabic site that would be the one
 * English line on the page, so the label is taken from the category tree, which
 * is public and cached for an hour. Anything the tree does not know keeps the
 * name the listing sent, and a tree outage leaves the row intact.
 */
export async function tradePreferenceChips(
  categories: TradePreferredCategory[] | null | undefined,
  locale: Locale,
): Promise<TradePreferenceChip[]> {
  const wanted = categories ?? [];
  if (wanted.length === 0) return [];

  const fallback = (category: TradePreferredCategory) => ({
    id: category.id,
    name: category.nameEn ?? category.name,
  });
  if (locale !== "ar") return wanted.map(fallback);

  const tree = await getCategoryTree().catch(() => null);
  if (!tree) return wanted.map(fallback);

  const names = new Map<string, string>();
  const walk = (nodes: Category[]) => {
    for (const node of nodes) {
      names.set(node.id, pickLocalized(node, "name", locale) || node.name);
      if (node.children?.length) walk(node.children);
    }
  };
  walk(tree);

  return wanted.map((category) => ({
    id: category.id,
    name: names.get(category.id) ?? fallback(category).name,
  }));
}
