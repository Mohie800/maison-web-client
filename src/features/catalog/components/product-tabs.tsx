"use client";

import { useState } from "react";

/**
 * PDP tab bar — Figma node 651:4420 ("Description | Specs | Shipping & Returns |
 * Seller Reviews").
 *
 * Every panel stays mounted and inactive ones are hidden with the `hidden`
 * attribute rather than unmounted. The description and specifications are the
 * page's indexable content, and a crawler that only sees the active tab would
 * miss most of it.
 *
 * Panels arrive as props so they can be rendered on the server — this component
 * owns only which one is visible.
 */
export interface ProductTab {
  key: string;
  label: string;
  panel: React.ReactNode;
}

export function ProductTabs({ tabs }: { tabs: ProductTab[] }) {
  const available = tabs.filter((tab) => tab.panel);
  const [active, setActive] = useState(available[0]?.key);

  if (available.length === 0) return null;

  return (
    <div className="mt-14">
      <div
        role="tablist"
        className="border-line flex flex-wrap gap-1 border-b"
      >
        {available.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`tab-${tab.key}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.key}`}
              onClick={() => setActive(tab.key)}
              className={`-mb-px border-b-2 px-5 py-3 text-[14px] transition-colors ${
                isActive
                  ? "border-ink text-ink font-semibold"
                  : "text-ink-secondary hover:text-ink border-transparent"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {available.map((tab) => (
        <div
          key={tab.key}
          role="tabpanel"
          id={`panel-${tab.key}`}
          aria-labelledby={`tab-${tab.key}`}
          hidden={tab.key !== active}
          className="pt-6"
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
