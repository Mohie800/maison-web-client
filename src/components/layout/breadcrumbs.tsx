import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

export interface Crumb {
  label: string;
  href?: string;
}

/** Breadcrumb trail. The separator flips direction in Arabic. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {item.href && !last ? (
                <Link href={item.href} className="text-caption text-action">
                  {item.label}
                </Link>
              ) : (
                <span
                  className="text-caption text-ink-tertiary"
                  aria-current={last ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!last && (
                <ChevronRight
                  className="text-ink-tertiary size-3 rtl:rotate-180"
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
