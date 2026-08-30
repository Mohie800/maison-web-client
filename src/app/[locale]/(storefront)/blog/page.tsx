import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Newspaper } from "lucide-react";
import { Link } from "@/i18n/navigation";

/**
 * Blog — Figma `651:16216` (Web_Blog).
 *
 * **The only page in Flow 16 with no content behind it.** The frame draws a
 * featured post and three article cards, each with a "Read More" that needs an
 * article page — and there is no article page in the design, no content
 * endpoint in the API (nothing under `/content`, `/posts` or `/articles`), and
 * no CMS. The four articles in the frame are placeholders, not copy we can
 * ship.
 *
 * So the hero is the frame's and the body is an honest empty state. Rendering
 * four invented articles behind buttons that lead nowhere would be worse than
 * saying there's nothing here yet. The category chips are omitted for the same
 * reason: they'd filter a list that doesn't exist (plans/09 C20, GAP-58).
 */
export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "Blog" });
  return { title: t("title"), description: t("subtitle"), robots: { index: false } };
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Blog");

  return (
    <div className="bg-surface flex flex-col">
      {/* Hero — 651:16217 */}
      <div className="bg-ink-900 flex h-[240px] flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-base text-[36px] font-bold">{t("title")}</h1>
        <p className="text-ink-500 text-[16px]">{t("subtitle")}</p>
      </div>

      {/* Sec — 651:16220 */}
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-16 lg:px-20">
        <h2 className="text-[22px] font-bold">{t("latest")}</h2>

        <div className="border-line bg-base flex flex-col items-center gap-3 rounded-16 border border-dashed p-14 text-center">
          <Newspaper className="text-ink-tertiary size-8" aria-hidden />
          <p className="text-[15px] font-semibold">{t("emptyTitle")}</p>
          <p className="text-ink-500 max-w-[440px] text-[13px]">{t("emptyBody")}</p>
          <Link
            href="/seller-guide"
            className="border-line text-action mt-2 flex h-9 items-center justify-center rounded-8 border px-3.5 text-[12px] font-medium"
          >
            {t("readGuide")}
          </Link>
        </div>
      </div>
    </div>
  );
}
