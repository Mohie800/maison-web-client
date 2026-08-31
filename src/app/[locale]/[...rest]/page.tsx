import { notFound } from "next/navigation";

/**
 * Catch-all so an unmatched URL inside a locale reaches the locale's own
 * `not-found.tsx` — Web_404_Error with the header, footer and language intact.
 *
 * Without this, Next answers an unmatched path from the *root* `not-found.tsx`,
 * which has no locale to render in. Both exist; this one is what visitors
 * normally hit.
 */
export default function CatchAll(): never {
  notFound();
}
