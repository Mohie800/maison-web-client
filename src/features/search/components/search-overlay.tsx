"use client";

import { useEffect, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { VisualSearchIcon } from "@/components/icons/header-icons";
import { resolveMediaUrl } from "@/lib/api/media";

/**
 * 01_Search — `651:2352`, all four of its states.
 *
 * The header's search box opens this as a 640px panel beneath itself:
 * `01_Search_Empty` until something is typed (recent searches + trending), then
 * `02_Search_Products` / `03_Search_People` / `04_Search_Brands` per tab.
 *
 * Every state is backed. `/search`, `/search/people`, `/search/brands`,
 * `/search/trending` and `/search/recent` all exist, and the people and brand
 * rows carry exactly what the frame prints — `formattedFollowersCount`,
 * `ratingAvg`, `formattedItemsCount`, `brandType`.
 *
 * **The form still works with JavaScript off.** It stays a GET form to
 * `/search`, so submitting goes to the full results page as it always did; this
 * panel is an enhancement on top, not a replacement. That is also why Enter is
 * left alone rather than hijacked.
 */

const TABS = ["products", "people", "brands"] as const;
type Tab = (typeof TABS)[number];

interface Trending {
  term: string;
  formattedCount?: string | null;
}
interface RecentSearch {
  id: string;
  query: string;
}
interface ProductHit {
  id: string;
  title: string;
  price?: string | number | null;
  originalPrice?: string | number | null;
  currency?: string | null;
  photoUrl: string | null;
  sellerHandle: string | null;
}
interface PersonHit {
  id: string;
  fullName?: string | null;
  username?: string | null;
  formattedFollowersCount?: string | null;
  ratingAvg?: number | null;
}
interface BrandHit {
  id: string;
  name: string;
  logoUrl?: string | null;
  brandType?: string | null;
  isVerified?: boolean | null;
  formattedFollowersCount?: string | null;
  ratingAvg?: number | null;
  formattedItemsCount?: string | null;
}

export interface SearchLabels {
  placeholder: string;
  visualSearch: string;
  search: string;
  tabs: Record<Tab, string>;
  recent: string;
  clearAll: string;
  remove: string;
  trending: string;
  seeAll: string;
  noResults: string;
  official: string;
  followers: string;
  items: string;
}

export function SearchOverlay({
  labels,
  trending,
  signedIn,
}: {
  labels: SearchLabels;
  trending: Trending[];
  signedIn: boolean;
}) {
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("products");
  const [recent, setRecent] = useState<RecentSearch[]>([]);
  const [products, setProducts] = useState<ProductHit[]>([]);
  const [people, setPeople] = useState<PersonHit[]>([]);
  const [brands, setBrands] = useState<BrandHit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const term = query.trim();

  /** Results belong to a term; dropping below two characters discards them. */
  const retype = (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setProducts([]);
      setPeople([]);
      setBrands([]);
      setTotal(0);
    }
  };

  useEffect(() => {
    if (!open) return;
    const away = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  // Recent searches belong to the account, so they load once the panel opens.
  useEffect(() => {
    if (!open || !signedIn || term) return;
    let cancelled = false;
    fetch("/api/proxy/search/recent", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setRecent(data.recentSearches ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, signedIn, term]);

  // One debounce for all three tabs — switching tabs re-queries immediately.
  useEffect(() => {
    if (!open || term.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const q = encodeURIComponent(term);
      if (!cancelled) setLoading(true);
      try {
        if (tab === "products") {
          const res = await fetch(`/api/proxy/search?q=${q}&limit=4`, {
            cache: "no-store",
          });
          const data = res.ok ? await res.json() : null;
          if (cancelled) return;
          setProducts(toProducts(data));
          setTotal(data?.total ?? data?.listings?.length ?? 0);
        } else {
          const res = await fetch(`/api/proxy/search/${tab}?q=${q}&limit=5`, {
            cache: "no-store",
          });
          const data = res.ok ? await res.json() : null;
          if (cancelled) return;
          if (tab === "people") setPeople(data?.items ?? []);
          else setBrands(data?.items ?? []);
          setTotal(data?.total ?? 0);
        }
      } catch {
        // Offline: the panel keeps whatever it had rather than blanking.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, term, tab]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const forget = async (id: string) => {
    setRecent((rows) => rows.filter((row) => row.id !== id));
    await fetch(`/api/proxy/search/recent/${id}`, { method: "DELETE" }).catch(
      () => {},
    );
  };

  const forgetAll = async () => {
    const ids = recent.map((row) => row.id);
    setRecent([]);
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/proxy/search/recent/${id}`, { method: "DELETE" }).catch(
          () => {},
        ),
      ),
    );
  };

  return (
    <div ref={root} className="relative hidden md:block">
      {/*
        Still a GET form to /search, so search works with no JavaScript and the
        query lands in the URL — which is what makes results shareable.
      */}
      <form
        action="/search"
        className={`bg-surface flex h-[42px] w-[284px] items-center gap-2 rounded-[21px] border px-4 ${
          open ? "border-aqua border-2" : "border-line-200"
        }`}
      >
        <input
          type="search"
          name="q"
          value={query}
          onChange={(event) => retype(event.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={labels.placeholder}
          aria-label={labels.placeholder}
          autoComplete="off"
          className="text-ink placeholder:text-ink-550 h-full min-w-0 flex-1 bg-transparent text-[14px] outline-none"
        />
        <Link
          href="/search/visual"
          aria-label={labels.visualSearch}
          className="text-ink-550 hover:text-action shrink-0"
        >
          <VisualSearchIcon className="h-[19px] w-[18px]" />
        </Link>
      </form>

      {open && (
        /* 01_Search_Empty — 651:2353 */
        <div
          role="listbox"
          className="bg-base border-line-200 absolute start-0 top-12 z-50 flex w-[640px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-16 border shadow-lg"
        >
          {/* Tabs — 651:2357 */}
          <div className="flex h-11 items-center gap-1.5 ps-4">
            {TABS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                aria-pressed={tab === key}
                className={`flex h-8 items-center justify-center rounded-16 px-4 text-[13px] ${
                  tab === key
                    ? "bg-aqua font-bold text-black"
                    : "bg-fill-100 text-ink-700"
                }`}
              >
                {labels.tabs[key]}
              </button>
            ))}
          </div>
          <span className="bg-fill-100 h-px w-full" aria-hidden />

          {term.length < 2 ? (
            <>
              {recent.length > 0 && (
                <>
                  {/* SL — 651:2365 */}
                  <div className="flex items-start justify-between px-4 pt-3 pb-2">
                    <span className="text-ink-400 text-[10px] font-bold tracking-[0.5px]">
                      {labels.recent}
                    </span>
                    <button
                      type="button"
                      onClick={forgetAll}
                      className="text-action text-[11px] font-medium"
                    >
                      {labels.clearAll}
                    </button>
                  </div>
                  {recent.map((row) => (
                    /* R — 651:2368 */
                    <div
                      key={row.id}
                      className="flex items-center justify-between px-4 py-2.5"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          go(`/search?q=${encodeURIComponent(row.query)}`)
                        }
                        className="text-ink-700 min-w-0 flex-1 truncate text-start text-[13px]"
                        dir="auto"
                      >
                        {row.query}
                      </button>
                      <button
                        type="button"
                        onClick={() => forget(row.id)}
                        aria-label={labels.remove}
                        className="text-ink-400 shrink-0 ps-3 text-[12px]"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <span className="bg-fill-100 h-px w-full" aria-hidden />
                </>
              )}

              {/* SL — 651:2381 */}
              <div className="flex justify-center px-4 pt-3 pb-2">
                <span className="text-ink-400 text-[10px] font-bold tracking-[0.5px]">
                  {labels.trending}
                </span>
              </div>
              {/* TR — 651:2383 */}
              <div className="flex flex-wrap gap-2 px-4 pb-4">
                {trending.map((row) => (
                  <button
                    key={row.term}
                    type="button"
                    onClick={() =>
                      go(`/search?q=${encodeURIComponent(row.term)}`)
                    }
                    className="bg-fill-100 flex h-8 items-center justify-center gap-1 rounded-16 px-3"
                  >
                    <span className="text-ink-700 text-[12px] font-medium">
                      {row.term}
                    </span>
                    {row.formattedCount && (
                      <span className="text-ink-400 text-[10px]">
                        {row.formattedCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <Results
              tab={tab}
              loading={loading}
              term={term}
              total={total}
              products={products}
              people={people}
              brands={brands}
              labels={labels}
              onGo={go}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Results({
  tab,
  loading,
  term,
  total,
  products,
  people,
  brands,
  labels,
  onGo,
}: {
  tab: Tab;
  loading: boolean;
  term: string;
  total: number;
  products: ProductHit[];
  people: PersonHit[];
  brands: BrandHit[];
  labels: SearchLabels;
  onGo: (href: string) => void;
}) {
  const rows =
    tab === "products"
      ? products.length
      : tab === "people"
        ? people.length
        : brands.length;

  if (!loading && rows === 0) {
    return (
      <p className="text-ink-400 px-4 py-8 text-center text-[13px]">
        {labels.noResults}
      </p>
    );
  }

  return (
    <>
      {tab === "products" && (
        <div className="grid grid-cols-1 gap-x-2 p-4 sm:grid-cols-2">
          {products.map((row) => (
            /* Card — 651:2427 */
            <button
              key={row.id}
              type="button"
              onClick={() => onGo(`/products/${row.id}`)}
              className="flex items-center gap-2.5 rounded-10 p-2 text-start"
            >
              <span className="bg-fill-100 size-13 shrink-0 overflow-hidden rounded-8">
                {row.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                  <img
                    src={row.photoUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                )}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span
                  className="text-ink-900 truncate text-[13px] font-semibold"
                  dir="auto"
                >
                  {row.title}
                </span>
                {row.sellerHandle && (
                  <span className="text-ink-400 truncate text-[11px]">
                    @{row.sellerHandle}
                  </span>
                )}
                <span className="flex items-baseline gap-1.5">
                  <span className="text-ink-900 text-[13px] font-bold">
                    {row.currency ?? "SAR"} {row.price}
                  </span>
                  {row.originalPrice && (
                    <span className="text-ink-400 text-[11px] line-through">
                      {row.currency ?? "SAR"} {row.originalPrice}
                    </span>
                  )}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {tab === "people" &&
        people.map((row) => (
          /* PR — 651:2508 */
          <button
            key={row.id}
            type="button"
            onClick={() => onGo(`/sellers/${row.id}`)}
            className="flex items-center gap-3 px-4 py-2.5 text-start"
          >
            <span className="bg-fill-100 text-ink-700 flex size-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold">
              {initials(row.fullName ?? row.username ?? "?")}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span
                className="text-ink-900 truncate text-[14px] font-semibold"
                dir="auto"
              >
                {row.fullName ?? row.username}
              </span>
              <span className="text-ink-500 truncate text-[12px]">
                {[
                  row.username ? `@${row.username}` : null,
                  row.formattedFollowersCount
                    ? `${row.formattedFollowersCount} ${labels.followers}`
                    : null,
                  row.ratingAvg ? String(row.ratingAvg) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
          </button>
        ))}

      {tab === "brands" &&
        brands.map((row) => (
          /* BR — 651:2575 */
          <button
            key={row.id}
            type="button"
            onClick={() => onGo(`/products?brandId=${row.id}`)}
            className="flex items-center gap-3 px-4 py-2.5 text-start"
          >
            <span className="bg-fill-100 size-11 shrink-0 overflow-hidden rounded-10">
              {resolveMediaUrl(row.logoUrl) && (
                // eslint-disable-next-line @next/next/no-img-element -- see plans/06 G12
                <img
                  src={resolveMediaUrl(row.logoUrl) ?? ""}
                  alt=""
                  className="size-full object-cover"
                />
              )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span
                className="text-ink-900 truncate text-[14px] font-semibold"
                dir="auto"
              >
                {row.name}
              </span>
              <span className="text-ink-500 truncate text-[12px]">
                {[
                  row.isVerified ? labels.official : row.brandType,
                  row.formattedFollowersCount
                    ? `${row.formattedFollowersCount} ${labels.followers}`
                    : null,
                  row.ratingAvg ? String(row.ratingAvg) : null,
                  row.formattedItemsCount
                    ? `${row.formattedItemsCount} ${labels.items}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
          </button>
        ))}

      {/* SA — 651:2484 */}
      {tab === "products" && products.length > 0 && (
        <button
          type="button"
          onClick={() => onGo(`/search?q=${encodeURIComponent(term)}`)}
          className="text-action border-fill-100 border-t px-4 py-3 text-center text-[13px] font-medium"
        >
          {labels.seeAll
            .replace("{count}", String(total))
            .replace("{term}", term)}
        </button>
      )}
    </>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

/** `/search` answers `{ listings: [...] }`, not the `{ items }` the others use. */
function toProducts(data: unknown): ProductHit[] {
  const rows =
    (data as { listings?: Record<string, unknown>[] } | null)?.listings ?? [];
  return rows.slice(0, 4).map((row) => {
    const photos = row.photos as { url?: string; isCover?: boolean }[] | null;
    const cover = photos?.find((p) => p.isCover) ?? photos?.[0];
    const seller = row.seller as { handle?: string } | null;
    return {
      id: String(row.id),
      title: String(row.title ?? ""),
      price: row.price as string | null,
      originalPrice: row.originalPrice as string | null,
      currency: row.currency as string | null,
      photoUrl: resolveMediaUrl(cover?.url),
      sellerHandle: seller?.handle ?? null,
    };
  });
}
