/**
 * Recent searches, kept in the browser.
 *
 * `GET /search/recent` and the two DELETEs exist; nothing writes a row. Neither
 * `/search?q=` nor `/listings?search=` records one and `POST /search/recent` is
 * a 404, so the panel's Recent block is empty from every client (plans/09 C32).
 * These rows are ours until a writer exists — the server list is still read and
 * shown first, so the day one appears this becomes the fallback rather than the
 * source.
 */

export interface RecentSearch {
  id: string;
  query: string;
  /** True for a row this browser stored, which is deleted locally. */
  local?: boolean;
}

const KEY = "maison.recentSearches";
const MAX = 8;

function read(): RecentSearch[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const rows: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(rows)) return [];
    return rows
      .filter(
        (row): row is { query: string } =>
          typeof (row as { query?: unknown })?.query === "string",
      )
      .map((row) => ({ id: row.query, query: row.query, local: true }));
  } catch {
    // Private mode, or a value another tab wrote badly: start empty.
    return [];
  }
}

function write(rows: RecentSearch[]): void {
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify(rows.map(({ query }) => ({ query }))),
    );
  } catch {
    // Storage full or blocked — recents are a convenience, not state.
  }
}

export function recentSearches(): RecentSearch[] {
  return typeof window === "undefined" ? [] : read();
}

/** Newest first, one row per term however it was capitalised. */
export function rememberSearch(query: string): void {
  if (typeof window === "undefined") return;
  const term = query.trim();
  if (!term) return;

  const rest = read().filter(
    (row) => row.query.toLowerCase() !== term.toLowerCase(),
  );
  write([{ id: term, query: term, local: true }, ...rest].slice(0, MAX));
}

export function forgetSearch(query: string): void {
  if (typeof window === "undefined") return;
  write(read().filter((row) => row.query !== query));
}

export function clearSearches(): void {
  if (typeof window === "undefined") return;
  write([]);
}
