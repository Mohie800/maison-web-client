"use client";

import { useState } from "react";
import { resolveMediaUrl } from "@/lib/api/media";

/**
 * PDP image gallery — main image plus thumbnail strip.
 *
 * Client-side only because selecting a thumbnail is pure view state. The first
 * image is server-rendered inside this markup, so the largest image on the page
 * is present in the initial HTML rather than waiting on hydration.
 */
export function ProductGallery({
  urls,
  title,
}: {
  urls: string[];
  title: string;
}) {
  const [active, setActive] = useState(0);
  const images = urls
    .map(resolveMediaUrl)
    .filter((u): u is string => Boolean(u));

  if (images.length === 0) {
    return <div className="bg-tint aspect-square w-full rounded-16" />;
  }

  const current = images[Math.min(active, images.length - 1)];

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-surface aspect-square w-full overflow-hidden rounded-16">
        {/* eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12 */}
        <img
          src={current}
          alt={title}
          className="size-full object-cover"
          fetchPriority="high"
        />
      </div>

      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto">
          {images.map((url, index) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`${title} — ${index + 1}`}
              aria-pressed={index === active}
              className={`size-20 shrink-0 overflow-hidden rounded-12 border-2 ${
                index === active ? "border-action" : "border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12 */}
              <img
                src={url}
                alt=""
                loading="lazy"
                className="size-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
