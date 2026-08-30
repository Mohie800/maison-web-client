"use client";

import { useEffect, useState } from "react";

/**
 * The auction timer chip — Figma `651:6977`, "01h:23m:45s".
 *
 * Client-side because it has to tick, and re-read from the clock each second
 * rather than decremented, so a backgrounded tab doesn't drift away from the
 * real deadline.
 *
 * Anti-snipe extensions move `auctionEndsAt` server-side, so a page that polls
 * or is revisited picks the new deadline up with no separate signal — which is
 * the design the backend asked us to build against while WebSocket is unfunded.
 */
/**
 * Four formats, because the frames disagree and each is deliberate:
 * `hms` "01h:23m:45s" on the auctions page (651:6978), `hm` "01h:23m" on the
 * homepage teaser (651:659) where the card is 36px tall, `clock` "00:23:45" in
 * the Ending Soon pill (651:1360), and `spaced` "02h : 45m : 18s" set at 28px
 * in the PDP timer band (651:4741).
 */
export type CountdownVariant = "hms" | "hm" | "clock" | "spaced";

export function AuctionCountdown({
  endsAt,
  endedLabel,
  variant = "hms",
}: {
  endsAt: string;
  endedLabel: string;
  variant?: CountdownVariant;
}) {
  const deadline = Date.parse(endsAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (Number.isNaN(deadline)) return null;

  const left = Math.max(0, Math.floor((deadline - now) / 1000));
  if (left === 0) return <span>{endedLabel}</span>;

  const pad = (n: number) => String(n).padStart(2, "0");
  const days = Math.floor(left / 86_400);
  const hours = Math.floor((left % 86_400) / 3600);
  const minutes = Math.floor((left % 3600) / 60);
  const seconds = left % 60;

  if (variant === "clock") {
    // Days roll into hours here — the pill has room for exactly eight glyphs.
    return (
      <span dir="ltr">
        {pad(days * 24 + hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    );
  }

  if (variant === "spaced") {
    return (
      <span dir="ltr">
        {days > 0 && `${days}d : `}
        {pad(hours)}h : {pad(minutes)}m : {pad(seconds)}s
      </span>
    );
  }

  if (variant === "hm") {
    return (
      <span dir="ltr">
        {days > 0 && `${days}d:`}
        {pad(hours)}h:{pad(minutes)}m
      </span>
    );
  }

  return (
    <span dir="ltr">
      {days > 0 && `${days}d:`}
      {pad(hours)}h:{pad(minutes)}m:{pad(seconds)}s
    </span>
  );
}
