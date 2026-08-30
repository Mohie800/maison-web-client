import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveMediaUrl } from "@/lib/api/media";
import { formatPrice, discountPercent } from "@/lib/format/money";
import type { Listing } from "@/lib/api/schemas/listing";
import { coverPhotoUrl } from "@/lib/api/schemas/listing";

/**
 * AI search band — Figma node 651:845.
 *
 * Exact spec: a 220px band on `#0f1723` inside a `bg/surface` section, 80px
 * gutters, 40px gap, a flex-1 text column and a fixed 320px card column.
 *
 * `#0f1723` is a one-off in the design — it is not `surface/invert` (#010413 /
 * #0F1117) and isn't in the token set, so it's written literally rather than
 * pretending a token exists for it.
 */
export async function AiSearchBanner({ deal }: { deal?: Listing | null }) {
  const t = await getTranslations("Home");

  const saving = deal
    ? discountPercent(deal.originalPrice, deal.price)
    : null;
  const dealImage = deal ? resolveMediaUrl(coverPhotoUrl(deal)) : null;

  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-col items-start gap-6 bg-[#0f1723] px-4 py-10 lg:h-[220px] lg:flex-row lg:items-center lg:gap-10 lg:px-20 lg:py-0">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
            <span className="bg-base flex h-7 items-center rounded-[14px] px-3 text-[10px] font-bold text-ink-500">
              {t("aiBadge")}
            </span>

            <h2 className="text-[22px] font-bold text-white lg:text-[26px]">
              {t("aiTitle")}
            </h2>

            <p className="text-ink-500 text-[14px]">{t("aiSubtitle")}</p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/search/visual"
                className="bg-action-tint flex h-12 items-center gap-2 rounded-[24px] px-7"
              >
                {/*
                  The icon carries its own gradient fill, so it stays a static
                  SVG rather than being inlined for `currentColor`.
                */}
                {/* eslint-disable-next-line @next/next/no-img-element -- static local SVG with a built-in gradient */}
                <img
                  src="/icons/ai-search.svg"
                  alt=""
                  width={21}
                  height={20}
                  className="shrink-0"
                />
                {/* Gradient text, #83e7b9 → #56b0d3, per the design. */}
                <span className="bg-gradient-to-r from-[#83e7b9] to-azure bg-clip-text text-[14px] font-bold text-transparent">
                  {t("tryAiSearch")}
                </span>
              </Link>

              <Link
                href="/about"
                className="bg-base flex h-12 items-center rounded-[24px] px-7 text-[14px] text-black"
              >
                {t("learnMore")}
              </Link>
            </div>
          </div>

          {/*
            The design's example card compares a listing against its "new" price.
            It's rendered from a real discounted listing, never invented: the
            mock's "Nike Air Max 90 — SAR 180 vs SAR 520" is a specific product
            and price claim, and fabricating one would be a false offer.
            No listing currently carries `originalPrice`, so this stays hidden
            until a seller sets one.
          */}
          {deal && saving !== null && (
            <div className="w-full lg:w-[320px] lg:shrink-0">
              <Link
                href={`/products/${deal.id}`}
                className="bg-base flex items-center gap-3 rounded-12 px-3.5 py-3"
              >
                <span className="bg-fill-100 flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-10">
                  {dealImage ? (
                    // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                    <img
                      src={dealImage}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : null}
                </span>

                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span
                    className="truncate text-[13px] font-semibold text-ink-900"
                    dir="auto"
                  >
                    {deal.title}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-[14px] font-bold text-aqua">
                      {formatPrice(deal.price, deal.currency ?? "SAR")}
                    </span>
                    <span className="text-ink-500 text-[11px]">
                      {t("vsNew", {
                        price: formatPrice(
                          deal.originalPrice,
                          deal.currency ?? "SAR",
                        ),
                      })}
                    </span>
                  </span>
                </span>

                <span className="bg-action flex h-7 shrink-0 items-center rounded-[14px] px-2.5 text-[10px] font-bold text-white">
                  {t("savePercent", { percent: saving })}
                </span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
