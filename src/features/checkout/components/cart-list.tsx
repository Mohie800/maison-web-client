import { getTranslations } from "next-intl/server";
import { BadgeCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { resolveMediaUrl } from "@/lib/api/media";
import { coverPhotoUrl } from "@/lib/api/schemas/listing";
import { formatPrice } from "@/lib/format/money";
import { removeBagItem, toggleBagItem } from "../actions";
import { CartItemCheckbox } from "./cart-item-checkbox";
import type { BagItem } from "@/lib/api/schemas/checkout";

/**
 * The bag, grouped by seller — Figma `651:7423`.
 *
 * The grouping, the handle and the Verified Seller mark all come off the
 * listing the bag already embeds (`listing.seller`), so this costs no extra
 * request.
 *
 * The per-item checkbox is not in the design. It stays because it is real: the
 * bag has `PATCH /bag/items/{id}/select` and `GET /bag` reports `selectedTotal`
 * separately from `total`, so a bag without checkboxes would misreport what
 * checkout charges. See plans/09 C26.
 */
export async function CartList({ items }: { items: BagItem[] }) {
  const t = await getTranslations("Checkout");
  const tListing = await getTranslations("Listing");

  const groups = groupBySeller(items);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-3">
          {group.handle && (
            <div className="bg-base border-line flex items-center gap-3 rounded-12 border px-4 py-3">
              <span className="bg-action-tint text-action flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
                {initials(group.handle)}
              </span>
              <span className="text-label">{group.handle}</span>
              {group.verified && (
                <span className="text-action text-caption flex items-center gap-1">
                  <BadgeCheck className="size-3.5" aria-hidden />
                  {t("verifiedSeller")}
                </span>
              )}
            </div>
          )}

          <ul className="flex flex-col gap-3">
            {group.items.map((item) => {
              const listing = item.listing;
              const image = listing ? resolveMediaUrl(coverPhotoUrl(listing)) : null;
              /**
               * `priceSnapshot` is what the buyer will pay — the price captured
               * when the item was added. Showing the live listing price instead
               * would misstate the total when a seller has since repriced.
               */
              const price = item.priceSnapshot ?? listing?.price;
              const meta = [
                listing?.condition
                  ? tListing(`conditions.${listing.condition}`, {
                      fallback: listing.condition,
                    })
                  : null,
                listing?.category?.name,
                item.itemType === "bundle" ? t("bundle") : null,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <li
                  key={item.id}
                  className="bg-base border-line flex gap-4 rounded-12 border p-4"
                >
                  <CartItemCheckbox
                    id={item.id}
                    selected={item.selected}
                    action={toggleBagItem}
                    selectLabel={t("select")}
                    deselectLabel={t("deselect")}
                  />

                  <Link
                    href={listing ? `/products/${listing.id}` : "/products"}
                    className="bg-surface size-20 shrink-0 overflow-hidden rounded-8"
                  >
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                      <img src={image} alt="" className="size-full object-cover" />
                    ) : null}
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link
                      href={listing ? `/products/${listing.id}` : "/products"}
                      dir="auto"
                      className="text-label line-clamp-2"
                    >
                      {listing?.title ?? t("itemUnavailable")}
                    </Link>
                    {meta && (
                      <span className="text-caption text-ink-tertiary">{meta}</span>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-h3">
                      {formatPrice(price, listing?.currency ?? "SAR")}
                    </span>
                    <form action={removeBagItem}>
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit" className="text-error text-caption">
                        {t("remove")}
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

interface SellerGroup {
  key: string;
  handle: string | null;
  verified: boolean;
  items: BagItem[];
}

/** Preserves bag order; items whose listing is gone fall into a trailing group. */
function groupBySeller(items: BagItem[]): SellerGroup[] {
  const groups: SellerGroup[] = [];

  for (const item of items) {
    const seller = item.listing?.seller;
    const key = seller?.id ?? "unknown";
    let group = groups.find((g) => g.key === key);

    if (!group) {
      group = {
        key,
        handle: seller?.handle ?? null,
        verified: Boolean(seller?.isVerified),
        items: [],
      };
      groups.push(group);
    }
    group.items.push(item);
  }

  return groups;
}

function initials(handle: string): string {
  const parts = handle.replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return handle.slice(0, 2).toUpperCase();
}
