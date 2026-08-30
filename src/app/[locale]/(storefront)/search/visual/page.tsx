import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { VisualSearch } from "@/features/search/components/visual-search";

/**
 * Visual Search — Figma `651:3680` … `651:3862` (the VS_* flow).
 *
 * `POST /search/visual` is public and its contract is good: detected
 * attributes, an exact match, similar items with match scores, a scanned count.
 *
 * The values it returns are currently randomised — the same photo yields
 * different attributes on each call (GAP-59, plans/STATUS). The screen
 * renders them exactly as the contract describes: disguising it here would hide
 * a backend problem behind our code, and what the detection returns is not the
 * client's to second-guess.
 *
 * Note plans/06 G6 recorded this flow as blocked on a design decision between
 * the VS_* and AISearch_* screens. The header's camera button points here, so
 * VS_* is the one that ships; AISearch_* remains unbuilt (plans/09 C21).
 *
 * The top bar is server-rendered; the flow beneath it is a client island,
 * because reading a file the user picked is something only the browser can do.
 */
export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "VisualSearch" });
  return { title: t("title"), description: t("subtitle"), robots: { index: false } };
}

export default async function VisualSearchPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("VisualSearch");

  return (
    <div className="bg-surface flex min-h-full flex-col">
      {/* VS_TopBar — 651:3681 */}
      <div className="bg-base border-line border-b">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 lg:px-20">
          <Link
            href="/"
            aria-label={t("close")}
            className="bg-surface text-ink-500 flex size-9 shrink-0 items-center justify-center rounded-full"
          >
            <X className="size-3.5" aria-hidden />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-[18px] font-semibold">{t("title")}</p>
            <p className="text-ink-500 truncate text-[13px]">{t("subtitle")}</p>
          </div>
          <span className="bg-action-tint border-action text-action flex h-[26px] shrink-0 items-center rounded-[13px] border px-2.5 text-[10px] font-bold">
            {t("scopeBadge")}
          </span>
        </div>
      </div>

      <VisualSearch />
    </div>
  );
}
