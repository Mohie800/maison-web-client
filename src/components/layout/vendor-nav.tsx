"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

/**
 * The rail's nav rows — `651:13503` (active) and `651:13506` (rest).
 *
 * Client-side so `usePathname` can mark the active row; the layout renders the
 * rail once rather than every page re-declaring which entry is current.
 */
export const VENDOR_SECTIONS = [
  {
    key: "main",
    items: [
      { key: "dashboard", href: "/vendor" },
      { key: "products", href: "/vendor/products" },
      { key: "orders", href: "/vendor/orders" },
    ],
  },
  {
    key: "analytics",
    items: [
      { key: "analytics", href: "/vendor/analytics" },
      { key: "sales", href: "/vendor/analytics/sales" },
      { key: "customers", href: "/vendor/analytics/customers" },
      { key: "topProducts", href: "/vendor/analytics/top-products" },
    ],
  },
  {
    key: "store",
    items: [
      { key: "storeProfile", href: "/vendor/store" },
      { key: "editStore", href: "/vendor/store/edit" },
      { key: "storeSettings", href: "/vendor/store/settings" },
      { key: "reviews", href: "/vendor/reviews" },
    ],
  },
  {
    key: "finance",
    items: [
      { key: "payouts", href: "/vendor/payouts" },
      { key: "reports", href: "/vendor/reports" },
      { key: "discounts", href: "/vendor/discounts" },
    ],
  },
] as const;

const HREFS = VENDOR_SECTIONS.flatMap((s) => s.items.map((i) => i.href));

/**
 * Longest matching prefix wins, so `/vendor/analytics/sales` lights Sales
 * Analytics rather than Analytics Hub, and `/vendor` only matches itself.
 */
function activeHref(pathname: string): string | null {
  let best: string | null = null;
  for (const href of HREFS) {
    const matches = pathname === href || pathname.startsWith(`${href}/`);
    if (matches && (best === null || href.length > best.length)) best = href;
  }
  return best;
}

export function VendorNav() {
  const t = useTranslations("Vendor");
  const current = activeHref(usePathname());

  return (
    <nav className="flex-1 overflow-y-auto">
      {VENDOR_SECTIONS.map((section) => (
        <div key={section.key}>
          <p className="text-ink-400 dark:text-ink-450 pt-4 pb-1.5 ps-5 text-[9px] leading-[11px] font-bold tracking-[0.72px]">
            {t(`sections.${section.key}`)}
          </p>
          <ul>
            {section.items.map((item) => {
              const isActive = item.href === current;
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={
                      isActive
                        ? "bg-vp-action dark:bg-fill-100 text-action dark:text-aqua flex items-center gap-2.5 px-5 py-2.5 text-[13px] leading-4 font-semibold"
                        : "text-ink-500 dark:text-ink-450 hover:bg-surface flex items-center px-5 py-2.5 text-[13px] leading-4"
                    }
                  >
                    {/* The active row's 3px bar indents its label by 13px. */}
                    {isActive && (
                      <span
                        className="bg-action dark:bg-aqua h-5 w-[3px] shrink-0 rounded-[1px]"
                        aria-hidden
                      />
                    )}
                    {t(`nav.${item.key}`)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
