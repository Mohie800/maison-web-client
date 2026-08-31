"use client";

import { useState } from "react";
import type { Coupon } from "@/lib/api/schemas/coupon";

/**
 * One coupon — `651:9420`. The frame draws four, each on its own tint with the
 * code, the offer, the expiry and Copy code; a used one is the same card at 50%
 * with the button gone.
 *
 * The tint rotates by position, as the frame does. Nothing on a coupon says
 * what colour it is, and picking by `discountType` would give every free-
 * shipping coupon the same green — which is not what the frame shows either.
 */

const TINTS = [
  { bg: "bg-aqua-tint2", text: "text-azure" },
  { bg: "bg-purple-tint", text: "text-purple-text" },
  { bg: "bg-success-tint3", text: "text-success" },
  { bg: "bg-warn-tint", text: "text-amber-deep" },
] as const;

export function CouponCard({
  coupon,
  index,
  used,
  offer,
  footer,
  copyLabel,
  copiedLabel,
}: {
  coupon: Coupon;
  index: number;
  used: boolean;
  /** "10% off your next order" — composed from the discount fields. */
  offer: string;
  /** "Expires 31 Jul 2026", or "Used · 12 Jun 2026". */
  footer: string | null;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const tint = TINTS[index % TINTS.length];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard denied — the code is on screen and can be selected.
    }
  };

  return (
    <div
      className={`relative flex h-[140px] flex-col rounded-16 p-5 ${tint.bg} ${
        used ? "opacity-50" : ""
      }`}
    >
      {/* badge — 651:9421 */}
      <span
        className={`bg-base w-fit rounded-[6px] px-2.5 py-1 text-[10px] font-bold tracking-[0.4px] ${tint.text}`}
        dir="ltr"
      >
        {coupon.code}
      </span>

      <p className={`mt-3.5 line-clamp-2 text-[15px] font-bold ${tint.text}`}>
        {offer}
      </p>

      <div className="mt-auto flex items-end justify-between gap-3">
        {footer && (
          <span className={`text-[12px] font-medium ${tint.text}`}>
            {footer}
          </span>
        )}
        {!used && (
          <button
            type="button"
            onClick={copy}
            className="bg-base border-line text-ink h-8 shrink-0 rounded-12 border px-4 text-[14px] font-semibold"
          >
            {copied ? copiedLabel : copyLabel}
          </button>
        )}
      </div>
    </div>
  );
}
