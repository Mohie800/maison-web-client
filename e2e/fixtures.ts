import { expect, type Page, type APIRequestContext } from "@playwright/test";

/**
 * Accounts and rows seeded on the shared dev API while building Flows 6 and 7.
 * They are listed under "Test data created on the backend" in plans/STATUS.
 *
 * These specs read shared state, so a fixture can legitimately disappear — the
 * helpers below skip with a message naming what is missing rather than failing
 * as though the app broke.
 */
export const ACCOUNTS = {
  /** Requester on TRD-6396; owns the probe bundle. */
  a: { email: "trade0830a@demo.maison", password: "Maison@2026" },
  /** Responder on TRD-6396; the one who countered. */
  b: { email: "trade0830b@demo.maison", password: "Maison@2026" },
  /** Carries the only wallet with settled transactions on it. */
  wallet: { email: "ord0830d@demo.maison", password: "Maison@2026" },
} as const;

export const FIXTURES = {
  /** Carries four probe `image` rows with deliberately hostile attachmentUrls. */
  conversationId: "8a41a8d7-1fe3-4498-8362-2b31d9ad11e1",
  /** The only available bundle: SAR 200 against SAR 230, 13% off. */
  bundleId: "32ab131e-7963-4edc-859a-4c81fccea2cc",
} as const;

/** Signs in through the app's own BFF route so the httpOnly cookies are real. */
export async function signIn(
  page: Page,
  who: keyof typeof ACCOUNTS,
): Promise<void> {
  const response = await page.request.post("/api/auth/login", {
    data: ACCOUNTS[who],
  });
  expect(
    response.ok(),
    `sign-in for ${ACCOUNTS[who].email} failed with ${response.status()}`,
  ).toBeTruthy();
}

/** Reads a fixture straight from the API, to decide whether a spec can run. */
export async function apiGet(
  request: APIRequestContext,
  path: string,
  token?: string,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const response = await request.get(
    `https://maison.dockbox.cloud/api/v1${path}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  );
  const body = await response.json().catch(() => null);
  return { ok: response.ok(), status: response.status(), body };
}

export async function apiToken(
  request: APIRequestContext,
  who: keyof typeof ACCOUNTS,
): Promise<string | null> {
  const response = await request.post(
    "https://maison.dockbox.cloud/api/v1/auth/login",
    { data: ACCOUNTS[who] },
  );
  if (!response.ok()) return null;
  const body = (await response.json()) as { accessToken?: string };
  return body.accessToken ?? null;
}

/**
 * Fails the test if the page rendered Next's error boundary.
 *
 * A server component that throws still returns 200 with an error page, so a
 * status check alone would call a broken screen healthy.
 */
export async function expectNoErrorBoundary(page: Page): Promise<void> {
  const body = await page.locator("body").innerText();
  expect(
    body,
    "the page rendered an application error rather than content",
  ).not.toMatch(/Application error|a client-side exception|Internal Server Error/i);
}

const API = "https://maison.dockbox.cloud/api/v1";

/** A 1×1 JPEG, so a probe listing can reach `live` without a real photo. */
const PIXEL_JPEG =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";

/** Every probe listing sits in one leaf category, so they are easy to spot. */
const PROBE_CATEGORY = "328118db-d7e7-459a-9e4a-b0e3501f8e7f";

async function api(
  request: APIRequestContext,
  method: "get" | "post",
  path: string,
  token: string,
  data?: unknown,
) {
  const response = await request[method](`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    ...(data ? { data } : {}),
  });
  return { ok: response.ok(), status: response.status(), body: await response.json().catch(() => null) };
}

export interface CounteredTrade {
  id: string;
  /** Signed from the responder's side, as the counter was sent. */
  counterAmount: number;
  requesterTotal: number;
  responderTotal: number;
}

/**
 * A trade in `countered`, found or created.
 *
 * A trade expires 24 hours after it is opened, so pinning a spec to a hard-coded
 * countered row means the spec quietly stops running a day later — which is what
 * happened to `TRD-6396`. This finds one first and only creates a pair of probe
 * listings when there is none, so the steady state is a single fixture that
 * renews itself about once a day.
 *
 * The counter runs *towards the requester* (`amount: -25`), which is the
 * direction that was inexpressible before GAP-85 and is the one worth pinning.
 */
export async function ensureCounteredTrade(
  request: APIRequestContext,
): Promise<CounteredTrade | null> {
  const a = await apiToken(request, "a");
  const b = await apiToken(request, "b");
  if (!a || !b) return null;

  const found = await api(request, "get", "/trade-requests?role=sent&status=countered", a);
  const open = ((found.body?.items ?? []) as { id: string; payerId?: string; responderId?: string }[])
    .find((row) => row.payerId && row.payerId === row.responderId);
  if (open) return read(open);

  const listing = async (token: string, title: string, price: number) => {
    const created = await api(request, "post", "/listings", token, {
      categoryId: PROBE_CATEGORY,
      title,
      description: "E2E fixture listing. Safe to delete.",
      condition: "like_new",
      attributes: { size: "M", color: ["Navy"] },
      price,
      tradeEnabled: true,
      imagesBase64: [PIXEL_JPEG],
    });
    return created.body?.id as string | undefined;
  };

  const mine = await listing(a, "E2E fixture — mine 300", 300);
  const theirs = await listing(b, "E2E fixture — theirs 500", 500);
  if (!mine || !theirs) return null;

  const addresses = await api(request, "get", "/addresses", a);
  const addressId = (addresses.body?.[0] ?? addresses.body?.items?.[0])?.id;

  const created = await api(request, "post", `/listings/${theirs}/trade-requests`, a, {
    offeredListingIds: [mine],
    ...(addressId ? { addressId } : {}),
    message: "Both barely worn — happy to cover the difference.",
  });
  if (!created.ok) return null;

  // The responder counters towards the requester: they pay 25, not receive it.
  const countered = await api(request, "post", `/trade-requests/${created.body.id}/counter`, b, {
    amount: -25,
    note: "Meeting you halfway on the difference.",
  });
  return countered.ok ? read(countered.body) : null;
}

function read(row: {
  id: string;
  counterAmount?: string | number;
  requesterTotal?: string | number;
  responderTotal?: string | number;
}): CounteredTrade {
  return {
    id: row.id,
    counterAmount: Number(row.counterAmount ?? 0),
    requesterTotal: Number(row.requesterTotal ?? 0),
    responderTotal: Number(row.responderTotal ?? 0),
  };
}
