"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/format/money";
import { AuctionCountdown } from "./auction-countdown";
import { distinctSteps, type AuctionStatus } from "@/lib/api/schemas/auction";
import { placeBidAction } from "../actions";

/**
 * The auction bid panel — Figma `651:4738`–`651:4775` on Web_PDP_Auction.
 *
 * Client-side because the numbers move: anti-snipe pushes `auctionEndsAt` out
 * and another bidder can raise the floor while this page sits open. It renders
 * the listing's snapshot immediately, then polls `auction-status` through the
 * proxy and re-renders from that — so a stale countdown never becomes a bid at
 * a price that has already been beaten.
 *
 * The form still posts to a Server Action, so bidding works with the panel's
 * JavaScript disabled; the amount is re-validated by the API either way.
 *
 * There is no way to read whether the viewer has accepted the auction terms —
 * `auction-entry` is POST-only (GAP-67) — so the button always says Place Bid,
 * as the frame does, and the action redirects to the terms page on the 403.
 * The result of a bid comes back as `?bid=` and is read here rather than in the
 * page, which would opt every PDP out of static generation.
 */

const POLL_MS = 10_000;

export interface BidPanelSnapshot {
  listingId: string;
  currency: string;
  currentBid: number;
  startingBid: number;
  bidCount: number;
  endsAt: string | null;
  minNextBid: number;
  antiSnipeWindowSeconds: number | null;
  antiSnipeExtensionSeconds: number | null;
}

export function BidPanel({
  snapshot,
  locale,
  termsHref,
}: {
  snapshot: BidPanelSnapshot;
  locale: string;
  termsHref: string;
}) {
  const t = useTranslations("AuctionBid");
  const tAuctions = useTranslations("Auctions");
  const outcome = useSearchParams().get("bid");
  const placed = outcome === "placed";
  const error = placed || !outcome ? null : outcome;
  const [live, setLive] = useState<AuctionStatus | null>(null);
  const [amount, setAmount] = useState<string>(String(snapshot.minNextBid));
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(
          `/api/proxy/listings/${snapshot.listingId}/auction-status`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = (await res.json()) as AuctionStatus;
        if (!cancelled) setLive(data);
      } catch {
        // Offline or signed out — the snapshot stays on screen.
      }
    };
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [snapshot.listingId]);

  const currentBid = num(live?.currentBid) || snapshot.currentBid;
  const bidCount = live?.bidCount ?? snapshot.bidCount;
  const endsAt = live?.auctionEndsAt ?? snapshot.endsAt;
  const minNextBid = live?.minNextBid ?? snapshot.minNextBid;
  const steps = distinctSteps(live?.quickBidSteps);
  const isLeading = live?.viewer?.isLeading === true;
  const isOutbid = live?.viewer?.isOutbid === true;
  const snipeWindow =
    live?.antiSnipeWindowSeconds ?? snapshot.antiSnipeWindowSeconds;
  const snipeExtension =
    live?.antiSnipeExtensionSeconds ?? snapshot.antiSnipeExtensionSeconds;

  // A poll that raises the floor drags an untouched amount up with it.
  const value = touched ? amount : String(minNextBid);
  const bidNumber = Number(value);
  const belowFloor = Number.isFinite(bidNumber) && bidNumber < minNextBid;

  return (
    <div className="flex flex-col gap-4">
      {/* Timer — 651:4738 */}
      {endsAt && (
        <div className="bg-warn-tint4 border-gold flex items-center gap-4 rounded-[14px] border p-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-amber-text text-[11px] font-medium">
              {t("endsIn")}
            </span>
            <span className="text-amber-text text-[28px] font-bold">
              <AuctionCountdown
                endsAt={endsAt}
                endedLabel={tAuctions("ended")}
                variant="spaced"
              />
            </span>
            <span className="text-amber-deep text-[11px]">
              {t("endsAt", { at: formatEndsAt(endsAt, locale) })}
            </span>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-0.5">
            <span className="text-amber-text text-[24px] font-bold">
              {bidCount}
            </span>
            <span className="text-amber-deep text-[11px]">
              {t("totalBids", { count: bidCount })}
            </span>
          </div>
        </div>
      )}

      {/* CURRENT BID — 651:4746 */}
      <div className="flex flex-col gap-2">
        <span className="text-ink-tertiary text-[10px] font-bold tracking-wide uppercase">
          {t("currentBid")}
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[36px] leading-none font-bold" dir="ltr">
            {formatPrice(currentBid, snapshot.currency)}
          </span>
          {isLeading && (
            <span className="bg-action-tint text-action flex h-[26px] items-center rounded-[13px] px-2.5 text-[11px] font-bold">
              {t("youAreLeading")}
            </span>
          )}
          {isOutbid && (
            <span className="bg-error-tint text-error flex h-[26px] items-center rounded-[13px] px-2.5 text-[11px] font-bold">
              {t("youAreOutbid")}
            </span>
          )}
        </div>
        <span className="text-ink-tertiary text-[12px]">
          {t("startedAt", {
            amount: formatPrice(snapshot.startingBid, snapshot.currency),
            count: bidCount,
          })}
        </span>
      </div>

      <div className="bg-line h-px w-full" />

      <form action={placeBidAction} className="flex flex-col gap-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="listingId" value={snapshot.listingId} />

        {/* QBH — 651:4753 */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-semibold">{t("quickBid")}</span>
          <span className="text-ink-tertiary text-[12px]">
            {t("minNextBid", {
              amount: formatPrice(minNextBid, snapshot.currency),
            })}
          </span>
        </div>

        {/* QBRow — 651:4756. Server render has no steps until the first poll. */}
        {steps.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {steps.map((step) => {
              const selected = Number(value) === step.amount;
              return (
                <button
                  key={step.percent}
                  type="button"
                  onClick={() => {
                    setTouched(true);
                    setAmount(String(step.amount));
                  }}
                  className={`flex h-[52px] min-w-[140px] flex-1 flex-col items-center justify-center gap-0.5 rounded-12 ${
                    selected
                      ? "bg-success-tint border-action border-2"
                      : "bg-fill-50 border-line border"
                  }`}
                >
                  <span
                    className={`text-[14px] font-bold ${selected ? "text-action" : ""}`}
                    dir="ltr"
                  >
                    {formatPrice(step.amount, snapshot.currency)}
                  </span>
                  <span className="text-ink-tertiary text-[11px]">
                    +{step.percent}%
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* CW — 651:4766 */}
        <label className="flex flex-col gap-1.5">
          <span className="text-ink-700 text-[12px] font-medium">
            {t("customAmount")}
          </span>
          <span
            className={`bg-base flex h-[52px] items-center gap-2 rounded-12 border-2 px-4 ${
              belowFloor ? "border-error" : "border-aqua"
            }`}
          >
            <span className="text-ink-tertiary text-[13px]">
              {snapshot.currency}
            </span>
            <input
              name="amount"
              type="number"
              inputMode="numeric"
              min={minNextBid}
              step="1"
              value={value}
              onChange={(event) => {
                setTouched(true);
                setAmount(event.target.value);
              }}
              className="text-ink-900 min-w-0 flex-1 bg-transparent text-[18px] font-bold outline-none"
              dir="ltr"
            />
          </span>
        </label>

        {/* Snipe — 651:4771 */}
        {snipeWindow != null && snipeExtension != null && (
          <p className="bg-warn-tint2 border-gold text-amber-text rounded-10 border px-3.5 py-2.5 text-[12px]">
            {t("antiSnipe", {
              window: Math.round(snipeWindow / 60) || 1,
              extension: Math.round(snipeExtension / 60) || 1,
            })}
          </p>
        )}

        {placed && (
          <p className="bg-success-tint text-action rounded-10 px-3.5 py-2.5 text-[13px] font-medium">
            {t("bidPlaced")}
          </p>
        )}

        {(error || belowFloor) && (
          <p className="text-error text-[13px] font-medium" role="alert">
            {belowFloor
              ? t("errors.bidTooLow")
              : t(`errors.${error}` as "errors.requestFailed")}
          </p>
        )}

        {/* PlaceBid — 651:4773 */}
        <button
          type="submit"
          disabled={belowFloor}
          className="bg-aqua flex h-14 items-center justify-center rounded-[28px] text-[16px] font-bold text-black disabled:opacity-50"
        >
          {t("placeBidFor", {
            amount: formatPrice(bidNumber || minNextBid, snapshot.currency),
          })}
        </button>

        <p className="text-ink-tertiary text-[12px]">{t("binding")}</p>
      </form>

      <a
        href={termsHref}
        className="text-action text-[12px] font-medium"
      >
        {t("readTerms")}
      </a>
    </div>
  );
}

function num(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

/** "Ends May 13, 2026 at 11:23 PM" — 651:4742. */
function formatEndsAt(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
