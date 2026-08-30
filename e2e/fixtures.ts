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
} as const;

export const FIXTURES = {
  /** Countered at SAR 95. A pays 95 + 5.20 commission + 15 shipping = 115.20. */
  counteredTradeId: "5d2004ee-fc60-44af-b409-370767733c4f",
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
