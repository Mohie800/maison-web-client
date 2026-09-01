"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

/**
 * Collapses the PLP sidebar behind a "Filters" button below `lg`.
 *
 * The panel is ~7 accordion groups tall, so stacking it above the grid put
 * every product a full screen of scrolling away on a phone. The panel itself
 * still renders on the server and every control inside it is still a plain
 * link — only the disclosure is client-side, and the `<noscript>` rule below
 * leaves it expanded when that isn't available.
 */
export function FilterDisclosure({
  label,
  activeCount,
  children,
}: {
  label: string;
  activeCount: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <aside className="w-full shrink-0 lg:w-[260px]">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        className="border-line bg-base text-ink-900 mb-3 flex h-11 w-full items-center justify-center gap-2 rounded-12 border text-[14px] font-semibold lg:hidden"
      >
        {open ? (
          <X className="size-4" aria-hidden />
        ) : (
          <SlidersHorizontal className="size-4" aria-hidden />
        )}
        {label}
        {activeCount > 0 && (
          <span className="bg-aqua text-on-accent flex size-5 items-center justify-center rounded-full text-[11px] font-bold">
            {activeCount}
          </span>
        )}
      </button>

      <div className={`plp-filters ${open ? "" : "max-lg:hidden"}`}>{children}</div>

      <noscript>
        <style
          dangerouslySetInnerHTML={{
            __html: ".plp-filters{display:block !important}",
          }}
        />
      </noscript>
    </aside>
  );
}
