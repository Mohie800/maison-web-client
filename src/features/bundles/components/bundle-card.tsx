import { Package } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Bundle } from "@/lib/api/schemas/bundle";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatPrice } from "@/lib/format/money";

/**
 * bundle — `651:4968`.
 *
 * A 2×2 mosaic, the savings badge, the title/price row and a "View bundle"
 * button that sits beneath the card rather than inside it, as the frame draws
 * it. Fewer than four photos leaves the remaining tiles as flat `bg/tint`.
 */
export function BundleCard({
  bundle,
  labels,
}: {
  bundle: Bundle;
  labels: {
    save: string;
    items: string;
    view: string;
    unavailable: string;
  };
}) {
  const covers = (bundle.coverPhotoUrls ?? []).slice(0, 4);
  const tiles = [0, 1, 2, 3].map((i) => resolveMediaUrl(covers[i]));
  const currency = "SAR";
  const available = bundle.isAvailable !== false;

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/bundles/${bundle.id}`}
        className="bg-base border-line block rounded-16 border p-[7px]"
      >
        {/* mosaic — 651:4969, with the badge overlaying its first tile */}
        <div className="relative grid grid-cols-2 gap-2">
          {bundle.discountPercent ? (
            /* badge — 651:4973 */
            <span className="bg-aqua-tint text-success absolute start-2 top-2 z-10 flex h-[22px] items-center rounded-6 px-2.5 text-[10px] font-bold tracking-[0.4px]">
              {labels.save.replace("{n}", String(bundle.discountPercent))}
            </span>
          ) : null}
          {tiles.map((url, index) => (
            <span
              key={index}
              className="bg-tint flex aspect-square items-center justify-center overflow-hidden rounded-8"
            >
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                <img
                  src={url}
                  alt=""
                  className="size-full object-cover"
                  loading="lazy"
                />
              ) : index === 0 ? (
                <Package className="text-ink-tertiary size-6" aria-hidden />
              ) : null}
            </span>
          ))}
        </div>

        <div className="px-2 pt-4 pb-2">
          <div className="flex items-start justify-between gap-3">
            <span
              className="text-ink truncate text-[16px] font-semibold"
              dir="auto"
            >
              {bundle.title}
            </span>
            <span className="flex shrink-0 items-baseline gap-2">
              <span className="text-ink text-[16px] font-bold" dir="ltr">
                {formatPrice(bundle.bundlePrice, currency)}
              </span>
              {bundle.originalTotal ? (
                <span
                  className="text-ink-tertiary text-[12px] line-through"
                  dir="ltr"
                >
                  {formatPrice(bundle.originalTotal, currency)}
                </span>
              ) : null}
            </span>
          </div>

          <span className="text-ink-tertiary mt-1 block text-[12px]">
            {labels.items.replace("{n}", String(bundle.itemCount ?? 0))}
          </span>
        </div>
      </Link>

      {/* btn/primary — 651:4979 */}
      {available ? (
        <Link
          href={`/bundles/${bundle.id}`}
          className="bg-aqua text-on-accent flex h-10 items-center justify-center rounded-12 text-[14px] font-semibold"
        >
          {labels.view}
        </Link>
      ) : (
        <span className="bg-fill-100 text-ink-500 flex h-10 items-center justify-center rounded-12 text-[14px] font-semibold">
          {labels.unavailable}
        </span>
      )}
    </div>
  );
}
