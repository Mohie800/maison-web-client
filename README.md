# Maison Web Client

Customer-facing web client for **Maison Sale**, a second-hand fashion marketplace (Saudi market, SAR, Arabic + English).

Plans and specs live in [`../plans`](../plans). Start with `../plans/README.md`; read `../plans/06-gaps-and-risks.md` before picking up any flow.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/ui · next-intl · TanStack Query · Zod · React Hook Form · Zustand

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then open http://localhost:3000 — it redirects to `/en`. Arabic is at `/ar`.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint, including the RTL guard |
| `npm run tokens` | Regenerate `src/styles/tokens.css` from `design/figma-tokens.json` |
| `npm run api:types` | Regenerate request types from the live OpenAPI spec |

## Conventions

**Design tokens are generated, not written.** `src/styles/tokens.css` is produced from `design/figma-tokens.json`, which mirrors the Figma variable collections. To resync after a design change, re-read the Figma variables, update the JSON, run `npm run tokens`. Never edit the CSS directly.

Tailwind utilities use cleaned token names: `bg-surface`, `text-ink`, `border-line`, `bg-action`, `text-h1`, `rounded-12`, `p-16`. The spacing and radius scales are restricted to the designed values.

**Logical CSS properties only.** `ms-*` not `ml-*`, `text-start` not `text-left`. ESLint fails the build otherwise. Arabic RTL is a launch requirement and this is the one thing that is genuinely painful to retrofit.

**Spacing uses the standard Tailwind scale** — `p-4` is 16px, not 4px. Design values that aren't on the scale are written explicitly: `h-[38px]`. Do **not** reintroduce px-named `--spacing-*` tokens: Tailwind still resolves undefined numeric steps against the 0.25rem base, so `p-16` would be 16px while `h-38` silently became 152px, and it collides with shadcn/ui, which is authored against the standard scale.

**Navigation comes from `@/i18n/navigation`,** not `next/link` or `next/navigation`, or the locale prefix is lost.

**Nothing calls `fetch` against the API directly.** Use `lib/api/endpoints/*`, which go through `apiFetch` so auth, error normalisation, and query serialisation stay in one place.

**Money is never a JS number.** The API returns decimal strings (`"150"`) in SAR. Format for display; take all totals from `POST /orders/checkout/preview`.

**Middleware is `src/proxy.ts`.** Next.js 16 renamed the convention.

## API notes

Base URL `https://maison.dockbox.cloud`, all routes under `/api/v1`. Spec at `/docs-json`.

The spec documents request DTOs but **no response bodies**, so response types are hand-written as Zod schemas in `src/lib/api/schemas/` and validated at the boundary — throwing in development, logging in production. See `../plans/02-api-integration.md`.

Gaps that block designed screens are tracked in `../plans/API-GAPS-FOR-BACKEND.md`.

## Auth

Tokens live in **httpOnly cookies**, never in `localStorage` — the site renders user-generated listings, reviews and messages, and the API's refresh tokens rotate, so a JS-readable refresh token would be one XSS away from account takeover.

That choice means the browser cannot attach its own bearer token, so:

- **Server Components** call the API directly via `lib/api/server.ts`, reading the token from cookies. No extra hop.
- **Client Components** call `lib/api/browser.ts`, which routes through `/api/proxy/[...path]`. That handler attaches the token, and on a 401 refreshes once, retries, and writes the rotated tokens back to the cookies.
- **Auth mutations** go to `/api/auth/*`, the only place session cookies are written.

Refresh is **single-flight** (`lib/auth/refresh.ts`): the API invalidates a refresh token the moment it's used, so two concurrent refreshes would sign the user out. Concurrent callers share one in-flight promise.

## Status

**Phases 1–2 complete.** See `../plans/05-roadmap.md`.

**Phase 1 — foundation**
- Scaffold, Tailwind v4, shadcn/ui with RTL enabled
- Token pipeline: 29 colour pairs (light + dark), 9 text styles, restricted spacing/radius scales
- next-intl with `en`/`ar`, locale-prefixed routes, `dir` switching, Inter + IBM Plex Sans Arabic
- API client with error normalisation, pagination helpers, media URL resolution, boundary validation
- TanStack Query provider, route gating in `proxy.ts`, RTL lint guard

**Phase 2 — auth & session**
- BFF route handlers, httpOnly cookie session, single-flight rotating refresh
- Authenticated proxy for client-side traffic
- Sign in / sign up (email + phone), OTP verify + resend, forgot / reset password
- Onboarding: profile setup with debounced username availability, favourite categories
- Validation messages as translation keys, so form errors are localised
- API validation errors mapped back onto form fields (`lib/api/field-errors.ts`)

Verified end to end against the live API: register → OTP → session cookies → authenticated request → gated route. Refresh-on-401 confirmed to rotate both cookies; an unrecoverable session is cleared rather than looping.

**Phase 3 (in progress) — storefront**
- Site chrome: util bar (language + light/dark), header with search, category sub-nav, footer
- Homepage built from the Figma design (`WEB-HOMEPAGE-1440`), server-rendered and cached
- `ProductCard` — the listing card reused by PLP, search and seller pages
- Money formatting that never converts decimal strings to numbers
- Theme switching via `next-themes` on the `.dark` class

### Homepage section status

| Section | Data |
|---|---|
| Stories bar, hero, AI search, categories, featured, trending, top sellers, just listed, trust bar, promo banner | Live API |
| Live auctions · Ending soon | **Unavailable state** — `GET /listings` can't filter by `saleMode` (API-02) or sort by `ending_soon` (API-07) |
| Top sellers | Live, but empty until the weekly ranking runs — real empty state |
| Active deals & coupons | **Not built** — no public coupons endpoint (API-21) |
| Sponsored store rail | **Not built** — no sponsorship model in the API |
| Hero stat strip | Only the category count is real; no platform-stats endpoint (API-22) |
| Hero artwork | Placeholder — needs the composed illustration exported from Figma by design |

Nothing on this page fabricates data. Where the API can't answer, the section says so.

### PLP — `/products`

Filters, sort and pagination are **links, not form controls**, so the whole page stays server-rendered, every filter state is a real shareable URL, and filtering works without JavaScript.

`src/features/catalog/filters.ts` holds `FILTER_SUPPORT`, which is the single place recording what the API can serve. Working today: **category, condition, brand, search, sort, pagination**. Hidden until the backend lands them: **price range, discount, size, material, sale mode** (API-02 / API-06). They're hidden rather than disabled — a greyed-out "Price range" invites bug reports; an absent one promises nothing. When the backend ships, flip the flag and add the param to `toListingQuery`; the UI and URL handling are already written against those keys.

### PDP — `/products/[id]`

Gallery, badges, price (with auction current-bid handling), attributes, specs, related items, and `Product` JSON-LD for rich results.

⚠️ **`GET /listings/{id}` currently returns 500 for every existing listing** (API-24). The page falls back to locating the same record via `GET /listings`, which works — same entity, working endpoint, not invented data — but it scans a bounded number of pages, so a listing outside that window 404s. `findListingViaList` is a stopgap for development and **must not ship**; delete it when API-24 is fixed.

The seller strip shows only a link through to the profile: `GET /sellers/{id}` requires auth (API-25), so a public product page has no seller name, rating or verified badge to display.

**Known gaps carried forward:** access tokens have no `exp` claim, so refresh rarely triggers in practice; sign-out clears cookies but cannot revoke server-side. Both are raised as API-18 and API-20 in `../plans/API-GAPS-FOR-BACKEND.md`.
