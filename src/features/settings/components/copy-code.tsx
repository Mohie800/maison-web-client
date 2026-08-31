"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

/**
 * The referral code field, its Copy button and Make a Referral — `656:216`
 * and `656:226`.
 *
 * "Make a Referral" uses the Web Share API with the API's own `shareMessage`
 * when the browser has one, and falls back to copying that message. The frame
 * draws a button with no destination, and a share sheet is what it means.
 */
export function CopyCode({
  code,
  shareMessage,
  copyLabel,
  copiedLabel,
  shareLabel,
  noCodeLabel,
}: {
  code: string;
  shareMessage: string | null;
  copyLabel: string;
  copiedLabel: string;
  shareLabel: string;
  noCodeLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  if (!code) {
    return <p className="text-ink-tertiary text-[13px]">{noCodeLabel}</p>;
  }

  const flash = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      flash();
    } catch {
      // Clipboard denied — the code is on screen and can be selected.
    }
  };

  const share = async () => {
    const text = shareMessage ?? code;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // Dismissed, or unsupported for this payload — fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      flash();
    } catch {
      // Nothing left to try; the code is still readable on the page.
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* Field/Code — 656:217 */}
      <span
        className="bg-base border-line-200 flex h-12 w-[200px] items-center justify-center rounded-8 border text-[15px] font-bold tracking-[0.45px]"
        dir="ltr"
      >
        {code}
      </span>

      {/* Button/Copy — 656:219 */}
      <button
        type="button"
        onClick={copy}
        className="bg-base border-line-200 text-ink flex h-12 items-center justify-center gap-1.5 rounded-8 border px-4 text-[13px] font-semibold"
      >
        <Copy className="size-4" aria-hidden />
        {copied ? copiedLabel : copyLabel}
      </button>

      {/* Button/MakeReferral — 656:226 */}
      <button
        type="button"
        onClick={share}
        className="bg-ink-900 text-base flex h-13 items-center justify-center rounded-8 px-7 text-[14px] font-semibold"
      >
        {shareLabel}
      </button>
    </div>
  );
}
