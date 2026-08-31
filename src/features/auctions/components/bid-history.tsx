"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/format/money";

/**
 * Bid History — `651:4903`, the list under `PDP_Auction_HighestBidder`.
 *
 * Polls the same `auction-status` the panel does, so a bid placed above appears
 * here without a reload and the two can never disagree.
 *
 * **Other bidders are anonymous, and that is the design's intent.** A bid
 * carries `bidderId` and no joined bidder, and the frame draws everyone but the
 * viewer as "Bidder 12" — a pseudonym, not a name it failed to load. The number
 * is derived from the id so it is stable within an auction, and the viewer's
 * own rows are named and tinted as the frame draws them (`651:4909`).
 */

interface Bid {
  id?: string | null;
  amount?: string | number | null;
  createdAt?: string | null;
  bidderId?: string | null;
}

export function BidHistory({
  listingId,
  currency,
  viewerId,
  viewerName,
  locale,
  labels,
}: {
  listingId: string;
  currency: string;
  viewerId?: string | null;
  viewerName?: string | null;
  /** Formatting happens here: a formatter is not serialisable across the
      server/client boundary, so the locale crosses instead of the function. */
  locale: string;
  labels: {
    title: string;
    you: string;
    bidder: string;
    empty: string;
  };
}) {
  const [bids, setBids] = useState<Bid[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(
          `/api/proxy/listings/${listingId}/auction-status`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { recentBids?: Bid[] };
        if (!cancelled) setBids(data.recentBids ?? []);
      } catch {
        // Offline: the list keeps whatever it had.
      }
    };
    load();
    const timer = setInterval(load, 15_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [listingId]);

  if (bids === null) return null;

  return (
    <section className="mt-12 flex flex-col gap-5">
      <h2 className="text-ink text-[18px] font-semibold">
        {labels.title.replace("{count}", String(bids.length))}
      </h2>

      {bids.length === 0 ? (
        <p className="text-ink-tertiary text-[13px]">{labels.empty}</p>
      ) : (
        <div className="bg-base border-line-200 flex flex-col overflow-hidden rounded-[14px] border">
          {bids.map((bid, index) => {
            const mine = Boolean(viewerId) && bid.bidderId === viewerId;
            return (
              <div
                key={bid.id ?? index}
                className={`flex items-center justify-between gap-4 px-5 py-3.5 ${
                  index > 0 ? "border-line-200 border-t" : ""
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-16 text-[11px] font-bold ${
                      mine
                        ? "bg-action text-base"
                        : "bg-fill-100 text-ink-500"
                    }`}
                  >
                    {mine ? initials(viewerName ?? "?") : "B"}
                  </span>
                  <span
                    className={`truncate text-[13px] ${
                      mine ? "text-action font-semibold" : "text-ink-900"
                    }`}
                    dir="auto"
                  >
                    {mine
                      ? viewerName
                        ? `${labels.you} (${viewerName})`
                        : labels.you
                      : labels.bidder.replace("{n}", pseudonym(bid.bidderId))}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-5">
                  {bid.createdAt && (
                    <span className="text-ink-400 text-[11px]">
                      {ago(bid.createdAt, locale)}
                    </span>
                  )}
                  <span
                    className={`text-[14px] font-bold ${
                      mine ? "text-action" : "text-ink-900"
                    }`}
                    dir="ltr"
                  >
                    {formatPrice(bid.amount ?? 0, currency)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** "2 min ago". The same largest-unit rule as `formatRelative` on the server. */
function ago(iso: string, locale: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  if (Number.isNaN(seconds)) return "";
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) {
      return format.format(Math.round(seconds / size), unit);
    }
  }
  return format.format(Math.round(seconds), "second");
}

/** Stable two-digit pseudonym from the bidder's id, as the frame's "Bidder 12". */
function pseudonym(id: string | null | undefined): string {
  if (!id) return "00";
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) % 100;
  return String(hash).padStart(2, "0");
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase() || "?";
}
