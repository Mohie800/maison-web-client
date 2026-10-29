"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-renders the result page every 2s while a BNPL session is pending; the
 * server component redirects once it settles. Gives up after 60s and shows `late`.
 */
export function SessionPoller({
  pending,
  late,
  intervalMs = 2000,
  timeoutMs = 60_000,
}: {
  pending: React.ReactNode;
  late: React.ReactNode;
  intervalMs?: number;
  timeoutMs?: number;
}) {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - started > timeoutMs) {
        clearInterval(timer);
        setTimedOut(true);
        return;
      }
      router.refresh();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [router, intervalMs, timeoutMs]);

  return timedOut ? late : pending;
}
