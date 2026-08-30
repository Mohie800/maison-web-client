import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

/**
 * Help Center shell — the hero and sidebar shared by every help page
 * (Figma `651:16267` / `651:16273`).
 *
 * The frame's sidebar lists seven destinations; four have screens designed and
 * routes built. **Payment Info**, **Shipping Info** and **Safety Tips** are
 * omitted: only Payment Info has a frame at all (`651:8155`), and none has a
 * route, so they'd be three rows that lead nowhere (plans/09 C19).
 *
 * The hero's search field is omitted for the same reason — there is no
 * help-article search, and a box that swallows what you type is worse than no
 * box. Both are back with design.
 */
const ITEMS = [
  { key: "faq", href: "/help" },
  { key: "contact", href: "/help/contact" },
  { key: "returns", href: "/help/returns" },
  { key: "sellerGuide", href: "/seller-guide" },
] as const;

export type HelpSection = (typeof ITEMS)[number]["key"];

export async function HelpShell({
  active,
  children,
}: {
  active: HelpSection;
  children: React.ReactNode;
}) {
  const t = await getTranslations("Help");

  return (
    <div className="bg-surface flex flex-col">
      {/* Hero — 651:16267 */}
      <div className="bg-ink-900 flex h-[160px] flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-base text-[28px] font-bold">{t("title")}</p>
        <p className="text-ink-400 text-[14px]">{t("subtitle")}</p>
      </div>

      {/* Main — 651:16272 */}
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pt-8 pb-16 lg:flex-row lg:items-start lg:px-20">
        {/* Sidebar — 651:16273 */}
        <nav
          aria-label={t("title")}
          className="bg-base border-line w-full shrink-0 overflow-hidden rounded-12 border py-4 lg:w-[260px]"
        >
          <ul className="flex flex-col">
            {ITEMS.map((item) => {
              const isActive = item.key === active;
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center justify-between px-5 py-[11px] text-[13px] ${
                      isActive
                        ? "bg-action-tint text-action justify-center font-semibold"
                        : "text-ink-700 hover:bg-tint"
                    }`}
                  >
                    {t(`nav.${item.key}`)}
                    {!isActive && (
                      <ChevronRight
                        className="text-ink-400 size-3 rtl:rotate-180"
                        aria-hidden
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col gap-4">{children}</div>
      </div>
    </div>
  );
}
