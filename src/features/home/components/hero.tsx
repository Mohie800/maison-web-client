import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * Homepage hero — Figma node 651:578.
 *
 * Exact spec: `t/action-tint` background, 80/60 padding, 60px gap; a 600px text
 * column and a 620×482 white card holding the artwork.
 *
 * The three figures are static marketing copy, matching the design. There is no
 * platform-stats endpoint (aggregate counts live only on `/admin/overview`,
 * which this client can't call — API-22), so they're translation strings that
 * marketing can edit without a code change, exactly as on the auth brand panel.
 * Deriving one of them from the category tree — which is what an earlier pass
 * did — produced a "9" that contradicted both the design and the four categories
 * shown in the sub-nav.
 */
export async function Hero() {
  const t = await getTranslations("Home");

  const stats = [
    { value: t("statItemsValue"), label: t("statItemsLabel") },
    { value: t("statSellersValue"), label: t("statSellersLabel") },
    { value: t("statCategoriesValue"), label: t("statCategories") },
  ];

  return (
    <section className="bg-action-tint">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-10 px-4 py-10 lg:flex-row lg:gap-[60px] lg:px-20 lg:py-[60px]">
        <div className="flex w-full flex-col items-start gap-5 lg:w-[600px] lg:shrink-0">
          <span className="bg-success-tint2 text-action flex h-[30px] items-center rounded-[15px] px-3.5 text-[11px] font-medium">
            {t("heroBadge")}
          </span>

          {/*
            The design sets this on one line in a 600px column; browser metrics
            render Inter a few pixels wider than Figma, which pushed it onto two.
            Tightening keeps the specified 48px rather than shrinking the type.

            The column is a hard 600px and this string needs ~603px, so the
            tightening alone left it a hair over; `whitespace-nowrap` pins it to
            one line, and with the tracking applied it measures ~578px, so there
            is real slack rather than a forced overflow.

            Expressed as "apply, then reset for RTL" rather than an `ltr:`
            variant — `ltr:` emits no CSS in this Tailwind build, while `rtl:`
            does. Arabic keeps normal tracking (negative values hurt cursive
            joining) and normal wrapping (its heading is shorter and free to
            break).
          */}
          <h1 className="text-ink-900 text-[32px] leading-tight font-bold lg:text-[48px] lg:tracking-[-0.02em] lg:whitespace-nowrap rtl:tracking-normal rtl:whitespace-normal">
            {t("heroTitle")}
          </h1>

          <p className="text-ink-500 text-[16px]">{t("heroSubtitle")}</p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/products"
              className="bg-aqua flex h-[50px] items-center rounded-[25px] px-7 text-[14px] font-bold text-black"
            >
              {t("startShopping")}
            </Link>
            <Link
              href="/sell"
              className="border-ink-900 text-ink-900 flex h-[50px] items-center rounded-[25px] border-2 px-7 text-[14px] font-bold"
            >
              {t("sellNow")}
            </Link>
          </div>

          <dl className="flex flex-wrap gap-x-10 gap-y-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-0.5">
                {/*
                  dir="ltr": "50K+" is a Latin-digit run ending in a neutral
                  character, which bidi reorders to "+50K" in an RTL paragraph.
                */}
                <dt className="text-action text-[22px] font-bold" dir="ltr">
                  {stat.value}
                </dt>
                <dd className="text-ink-500 text-[12px]">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="border-line-200 bg-base relative w-full overflow-hidden rounded-20 border lg:h-[482px] lg:w-[620px] lg:shrink-0">
          <Image
            src="/brand/hero.webp"
            alt=""
            width={1316}
            height={987}
            priority
            sizes="(min-width: 1024px) 620px, 100vw"
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}
