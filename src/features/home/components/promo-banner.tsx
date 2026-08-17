import { getTranslations, getLocale } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { pickLocalized } from "@/lib/i18n/localized";
import { resolveMediaUrl } from "@/lib/api/media";
import type { Banner } from "@/lib/api/schemas/catalog";
import type { Locale } from "@/i18n/routing";

/**
 * Sponsored / promotional banner — Figma nodes 651:1551 and 651:1463.
 *
 * Content is entirely API-driven (`GET /banners?placement=…`) so marketing can
 * change it from the dashboard. Nothing here is hardcoded from the mockup: the
 * "STC Pay" and "Nike Official Store" units in the design are example content,
 * not fixed copy, and hardcoding a payment partner or a brand we may not have
 * an agreement with would be wrong on its own terms.
 */
export async function PromoBanner({ banner }: { banner: Banner | undefined }) {
  const t = await getTranslations("Home");
  const locale = (await getLocale()) as Locale;

  if (!banner) return null;

  const title = pickLocalized(banner, "title", locale);
  const subtitle = pickLocalized(banner, "subtitle", locale);
  const description = pickLocalized(banner, "description", locale);
  const cta = pickLocalized(banner, "ctaLabel", locale);
  const image = resolveMediaUrl(banner.imageUrl);

  const href =
    banner.linkType === "listing" && banner.linkValue
      ? `/products/${banner.linkValue}`
      : banner.linkType === "category" && banner.linkValue
        ? `/products?categoryId=${banner.linkValue}`
        : banner.linkType === "url" && banner.linkValue
          ? banner.linkValue
          : "/products";

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-14 lg:px-20">
      <div className="bg-invert relative flex flex-col gap-4 overflow-hidden rounded-16 p-8 text-white lg:flex-row lg:items-center">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
          <img
            src={image}
            alt=""
            className="absolute inset-0 size-full object-cover opacity-25"
          />
        )}

        <div className="relative flex flex-1 flex-col gap-2">
          <span className="text-[10px] font-bold tracking-widest uppercase text-white/50">
            {t("sponsored")}
          </span>
          <h2 className="text-h2 text-white">{title}</h2>
          {subtitle && <p className="text-body-lg text-action">{subtitle}</p>}
          {description && (
            <p className="text-caption max-w-[640px] text-white/60">
              {description}
            </p>
          )}
        </div>

        {cta && (
          <Link
            href={href}
            className="text-label relative flex h-11 shrink-0 items-center gap-2 rounded-[22px] bg-white px-5 font-semibold text-black"
          >
            {cta}
            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
}
