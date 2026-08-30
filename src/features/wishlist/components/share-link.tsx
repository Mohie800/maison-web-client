"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

/** The public URL of a shared wishlist, with a copy button. */
export function ShareLink({
  url,
  live,
  hint,
}: {
  url: string;
  live: string;
  hint: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <div className="border-line bg-tint flex flex-col gap-2 rounded-12 border p-4">
      <p className="text-caption text-ink-secondary">{live}</p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          aria-label={hint}
          dir="ltr"
          onFocus={(event) => event.currentTarget.select()}
          className="bg-base border-line text-caption h-9 min-w-0 flex-1 rounded-8 border px-3"
        />
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(url).then(() => setCopied(true));
          }}
          className="border-line text-caption text-ink-secondary hover:border-ink-tertiary flex h-9 shrink-0 items-center gap-1.5 rounded-8 border px-3"
        >
          {copied ? (
            <Check className="size-3.5" aria-hidden />
          ) : (
            <Copy className="size-3.5" aria-hidden />
          )}
          {hint}
        </button>
      </div>
    </div>
  );
}
