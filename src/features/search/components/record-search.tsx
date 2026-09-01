"use client";

import { useEffect } from "react";
import { rememberSearch } from "../recent-searches";

/**
 * Records a search that was actually submitted — one recent row, and one call
 * to `GET /search?q=`, which is the only endpoint that increments a trending
 * term (plans/09 C32; `/listings?search=` renders the results and counts
 * nothing). It answers anonymously, so a signed-out search counts too.
 *
 * Mounted on the results page rather than wired to the two search forms, so it
 * catches every way a term gets submitted — Enter, "See all results", a
 * trending chip, a recent row — and never a keystroke: this only runs on a term
 * that made it into the URL. Once per term per tab, so re-filtering or paging
 * through the same results does not count again.
 */
export function RecordSearch({ term }: { term: string }) {
  useEffect(() => {
    const query = term.trim();
    if (!query) return;

    rememberSearch(query);

    const key = `maison.counted:${query.toLowerCase()}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // Blocked storage: counting a term twice beats never counting it.
    }

    // Fire and forget — the response is the results we already have.
    fetch(`/api/proxy/search?q=${encodeURIComponent(query)}&limit=1`, {
      keepalive: true,
    }).catch(() => {});
  }, [term]);

  return null;
}
