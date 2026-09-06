import { Link } from "@/i18n/navigation";

/**
 * The portal's tab strip — `651:13709`. One bordered bar, a count pill per tab,
 * the current tab's pill in the action tint and everything else in fill.
 */
export interface VendorTab {
  key: string;
  label: string;
  count: number;
  href: string;
}

export function VendorTabs({
  tabs,
  active,
  gap = "normal",
}: {
  tabs: VendorTab[];
  active: string;
  /** Orders packs its five tabs tighter than Products does — 651:13914. */
  gap?: "normal" | "tight";
}) {
  const spacing = gap === "tight" ? "gap-1.5 px-3.5" : "gap-2 px-4";
  return (
    <div className="bg-base dark:bg-tint border-line-200 rounded-10 flex h-12 items-center overflow-x-auto border ps-2">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex h-12 shrink-0 items-center text-[13px] ${spacing} ${
              isActive
                ? "text-ink-900 font-semibold"
                : "text-ink-500 dark:text-ink-450"
            }`}
          >
            {tab.label}
            <span
              dir="ltr"
              className={`rounded-10 flex h-5 items-center px-[7px] text-[9px] font-bold ${
                isActive
                  ? "bg-vp-action text-action dark:text-aqua"
                  : "bg-fill-100 text-ink-500 dark:text-ink-450"
              }`}
            >
              {tab.count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
