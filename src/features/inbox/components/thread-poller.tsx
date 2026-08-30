"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Refreshes the open thread on an interval.
 *
 * The WebSocket gateway is still not deployed (API-04), so this is the interim
 * the route map calls for. It re-renders the server component rather than
 * fetching messages itself, which keeps one rendering path instead of two.
 *
 * Paused while the tab is hidden — an inbox left open in a background tab
 * should not poll all day.
 */
export function ThreadPoller({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, intervalMs]);

  return null;
}
