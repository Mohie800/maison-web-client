"use client";

import { useLinkStatus } from "next/link";

/**
 * A hairline under the conversation row being opened.
 *
 * `/inbox/[id]` has no `loading.tsx` on purpose — one there would replace the
 * rail as well as the thread — and Next's docs name exactly this case for
 * `useLinkStatus`: a dynamic route with no route-level fallback, where the
 * click otherwise looks ignored until the pane arrives.
 *
 * It must be rendered inside the `<Link>` whose status it reports.
 */
export function RowPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;

  return (
    <span
      aria-hidden
      className="bg-aqua absolute bottom-0 start-0 h-0.5 w-full animate-pulse"
    />
  );
}
